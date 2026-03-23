"""
Tenant billing tasks.

Phase IS.2 implements session-based invoice schedule evaluation.
"""

from __future__ import annotations

from datetime import date
import logging

try:
    from celery import shared_task
except ModuleNotFoundError:  # pragma: no cover
    # Celery is optional in some test environments; make tasks importable.
    def shared_task(func=None, **_kwargs):
        if func is None:
            def decorator(f):
                # Provide a synchronous .delay() fallback so wrappers can
                # call the same API without requiring Celery.
                def _delay(*args, **kwargs):
                    return f(*args, **kwargs)

                f.delay = _delay
                return f
            return decorator
        # Also attach delay for the non-decorator call-path.
        def _delay(*args, **kwargs):
            return func(*args, **kwargs)

        func.delay = _delay
        return func

from django.db import transaction
from django.db.models import Count, Max
from django.utils import timezone

from tenant.attendance.models import Attendance
from tenant.billing.invoice_schedule_service import generate_invoices_for_schedule
from tenant.billing.models import (
    BillingType,
    Invoice,
    InvoiceCreationTiming,
    InvoiceSchedule,
    InvoiceScheduleRun,
    RunStatus,
    StudentInvoiceCycle,
    TriggerSource,
)
from tenant.classes.models import Enrollment

logger = logging.getLogger(__name__)


def resolve_effective_invoice_creation_timing(schedule: InvoiceSchedule) -> InvoiceCreationTiming:
    """
    Resolve AUTO to preserve historical behavior.

    - SESSION_BASED: invoices created on completion (when sessions_per_cycle reached)
    - MONTHLY: invoices created on billing_day (start of monthly cycle)
    """

    if schedule.invoice_creation_timing == InvoiceCreationTiming.AUTO:
        return (
            InvoiceCreationTiming.ON_COMPLETION
            if schedule.billing_type == BillingType.SESSION_BASED
            else InvoiceCreationTiming.START_OF_PERIOD
        )

    return schedule.invoice_creation_timing


@shared_task
def evaluate_session_schedules(
    schedule_id: int | None = None,
    triggered_by: TriggerSource = TriggerSource.SCHEDULED,
):
    """
    Evaluate SESSION_BASED invoice schedules and auto-generate invoices.
    """
    schedules = InvoiceSchedule.objects.filter(
        billing_type=BillingType.SESSION_BASED,
        is_active=True,
    )
    if schedule_id is not None:
        schedules = schedules.filter(id=schedule_id)

    schedules = schedules.select_related(
        "academy",
        "class_obj",
        "class_obj__sport",
        "class_obj__location",
        "billing_item",
    )

    for schedule in schedules:
        invoices_created = 0
        try:
            effective_timing = resolve_effective_invoice_creation_timing(schedule)

            with transaction.atomic():
                qualifying_cycles: list[StudentInvoiceCycle] = []
                start_invoice_cycles: list[StudentInvoiceCycle] = []
                next_start_invoice_cycles: list[StudentInvoiceCycle] = []

                def queue_start_invoice(cycle: StudentInvoiceCycle) -> None:
                    # Avoid duplicates (same student/cycle can be referenced more than once).
                    if cycle.invoice_id is not None:
                        return
                    start_invoice_cycles_ids = {c.id for c in start_invoice_cycles}
                    if cycle.id in start_invoice_cycles_ids:
                        return
                    start_invoice_cycles.append(cycle)

                # Evaluate attendance per enrolled student.
                enrollments = (
                    Enrollment.objects.filter(
                        class_obj=schedule.class_obj,
                        status=Enrollment.Status.ENROLLED,
                    )
                    .select_related("student", "student__parent")
                    .order_by("student_id")
                )

                for enrollment in enrollments:
                    student = enrollment.student

                    # Find the latest "open" cycle based on the timing mode.
                    if effective_timing == InvoiceCreationTiming.START_OF_PERIOD:
                        cycle = (
                            StudentInvoiceCycle.objects.filter(
                                schedule=schedule,
                                student=student,
                                sessions_counted__lt=schedule.sessions_per_cycle,
                            )
                            .order_by("-cycle_number")
                            .first()
                        )
                    else:
                        # Historical behavior: only cycles that don't have an invoice yet.
                        cycle = (
                            StudentInvoiceCycle.objects.filter(
                                schedule=schedule,
                                student=student,
                                invoice__isnull=True,
                            )
                            .order_by("-cycle_number")
                            .first()
                        )

                    if cycle is None:
                        latest_cycle = (
                            StudentInvoiceCycle.objects.filter(
                                schedule=schedule,
                                student=student,
                            )
                            .order_by("-cycle_number")
                            .first()
                        )
                        next_cycle_number = (latest_cycle.cycle_number + 1) if latest_cycle else 1
                        cycle = StudentInvoiceCycle.objects.create(
                            schedule=schedule,
                            student=student,
                            cycle_number=next_cycle_number,
                            sessions_counted=0,
                            last_counted_date=None,
                            invoice=None,
                        )

                    if effective_timing == InvoiceCreationTiming.START_OF_PERIOD and cycle.invoice_id is None:
                        queue_start_invoice(cycle)

                    attendance_filters = {
                        "academy": schedule.academy,
                        "student": student,
                        "class_obj": schedule.class_obj,
                        "date__gte": schedule.cycle_start_date,
                    }
                    if cycle.last_counted_date is not None:
                        attendance_filters["date__gt"] = cycle.last_counted_date
                    if not schedule.bill_absent_sessions:
                        attendance_filters["status"] = Attendance.Status.PRESENT

                    stats = (
                        Attendance.objects.filter(**attendance_filters)
                        .aggregate(count=Count("id"), max_date=Max("date"))
                    )
                    additional_sessions = stats["count"] or 0
                    max_date = stats["max_date"]

                    if additional_sessions:
                        cycle.sessions_counted = cycle.sessions_counted + additional_sessions
                        cycle.last_counted_date = max_date
                        cycle.save(update_fields=["sessions_counted", "last_counted_date"])

                    if cycle.sessions_counted >= schedule.sessions_per_cycle:
                        qualifying_cycles.append(cycle)

                # Create invoices for cycles at START.
                if effective_timing == InvoiceCreationTiming.START_OF_PERIOD and start_invoice_cycles:
                    start_students = [c.student for c in start_invoice_cycles]
                    service_result = generate_invoices_for_schedule(schedule, start_students)
                    invoices_created += service_result["invoices_created"]
                    student_to_invoice = service_result["student_to_invoice"]

                    for cycle in start_invoice_cycles:
                        invoice = student_to_invoice.get(cycle.student_id)
                        if invoice is None:
                            raise RuntimeError(f"Invoice mapping missing for student_id={cycle.student_id}")
                        cycle.invoice = invoice
                        cycle.save(update_fields=["invoice"])

                # For ON_COMPLETION (or if a cycle is missing an invoice), generate at completion.
                if effective_timing != InvoiceCreationTiming.START_OF_PERIOD and qualifying_cycles:
                    completion_students = [c.student for c in qualifying_cycles]
                    service_result = generate_invoices_for_schedule(schedule, completion_students)
                    invoices_created += service_result["invoices_created"]
                    student_to_invoice = service_result["student_to_invoice"]

                    for cycle in qualifying_cycles:
                        invoice = student_to_invoice.get(cycle.student_id)
                        if invoice is None:
                            raise RuntimeError(f"Invoice mapping missing for student_id={cycle.student_id}")
                        cycle.invoice = invoice
                        cycle.save(update_fields=["invoice"])
                elif effective_timing == InvoiceCreationTiming.START_OF_PERIOD and qualifying_cycles:
                    # START mode should normally have invoices already; create any missing ones.
                    missing_invoice_cycles = [c for c in qualifying_cycles if c.invoice_id is None]
                    if missing_invoice_cycles:
                        missing_students = [c.student for c in missing_invoice_cycles]
                        service_result = generate_invoices_for_schedule(schedule, missing_students)
                        invoices_created += service_result["invoices_created"]
                        student_to_invoice = service_result["student_to_invoice"]
                        for cycle in missing_invoice_cycles:
                            invoice = student_to_invoice.get(cycle.student_id)
                            if invoice is None:
                                raise RuntimeError(f"Invoice mapping missing for student_id={cycle.student_id}")
                            cycle.invoice = invoice
                            cycle.save(update_fields=["invoice"])

                # Close qualifying cycles and open the next ones.
                for cycle in qualifying_cycles:
                    # Close the cycle by linking the generated invoice (or already-generated invoice).
                    if cycle.invoice_id is None:
                        raise RuntimeError(
                            f"Expected cycle.invoice to be set before closing "
                            f"(schedule_id={schedule.id}, student_id={cycle.student_id})."
                        )

                    close_last_counted_date = cycle.last_counted_date

                    # Open the next cycle.
                    next_cycle_number = cycle.cycle_number + 1
                    next_cycle = StudentInvoiceCycle.objects.filter(
                        schedule=schedule,
                        student=cycle.student,
                        cycle_number=next_cycle_number,
                    ).first()

                    if next_cycle is None:
                        next_cycle = StudentInvoiceCycle.objects.create(
                            schedule=schedule,
                            student=cycle.student,
                            cycle_number=next_cycle_number,
                            sessions_counted=0,
                            last_counted_date=close_last_counted_date,
                            invoice=None,
                        )
                    else:
                        # In START mode, next_cycle.invoice can already exist (created at start).
                        if effective_timing == InvoiceCreationTiming.ON_COMPLETION:
                            if next_cycle.invoice_id is not None:
                                raise RuntimeError(
                                    f"Next cycle already has invoice for schedule_id={schedule.id} "
                                    f"student_id={cycle.student_id} cycle_number={next_cycle_number}"
                                )

                        # Only reset if the cycle hasn't begun counting yet.
                        if next_cycle.sessions_counted == 0:
                            next_cycle.last_counted_date = close_last_counted_date
                            next_cycle.save(update_fields=["last_counted_date"])

                    if effective_timing == InvoiceCreationTiming.START_OF_PERIOD and next_cycle.invoice_id is None:
                        next_start_invoice_cycles.append(next_cycle)

                # Create invoices for next cycles opened during closure.
                if effective_timing == InvoiceCreationTiming.START_OF_PERIOD and next_start_invoice_cycles:
                    next_students = [c.student for c in next_start_invoice_cycles]
                    service_result = generate_invoices_for_schedule(schedule, next_students)
                    invoices_created += service_result["invoices_created"]
                    student_to_invoice = service_result["student_to_invoice"]

                    for cycle in next_start_invoice_cycles:
                        invoice = student_to_invoice.get(cycle.student_id)
                        if invoice is None:
                            raise RuntimeError(f"Invoice mapping missing for student_id={cycle.student_id}")
                        cycle.invoice = invoice
                        cycle.save(update_fields=["invoice"])

            # Schedule processed successfully.
            schedule.last_run_at = timezone.now()
            schedule.save(update_fields=["last_run_at"])
            InvoiceScheduleRun.objects.create(
                schedule=schedule,
                status=RunStatus.SUCCEEDED,
                invoices_created=invoices_created,
                triggered_by=triggered_by,
            )
        except Exception as exc:
            logger.exception("evaluate_session_schedules failed for schedule_id=%s", schedule.id)
            schedule.last_run_at = timezone.now()
            schedule.save(update_fields=["last_run_at"])
            InvoiceScheduleRun.objects.create(
                schedule=schedule,
                status=RunStatus.FAILED,
                invoices_created=invoices_created,
                triggered_by=triggered_by,
                error_detail=str(exc)[:4000],
            )


@shared_task
def evaluate_monthly_schedules(
    schedule_id: int | None = None,
    triggered_by: TriggerSource = TriggerSource.SCHEDULED,
):
    """
    Evaluate MONTHLY invoice schedules and auto-generate invoices.
    """
    today = date.today()
    now = timezone.now()

    schedules = InvoiceSchedule.objects.filter(
        billing_type=BillingType.MONTHLY,
        is_active=True,
        cycle_start_date__lte=today,
    )
    if schedule_id is not None:
        schedules = schedules.filter(id=schedule_id)
    schedules = schedules.select_related(
        "academy",
        "class_obj",
        "class_obj__sport",
        "class_obj__location",
        "billing_item",
    )

    for schedule in schedules:
        invoices_created = 0
        try:
            import calendar

            effective_timing = resolve_effective_invoice_creation_timing(schedule)
            last_day = calendar.monthrange(today.year, today.month)[1]

            if effective_timing == InvoiceCreationTiming.START_OF_PERIOD:
                if schedule.billing_day != today.day:
                    continue
            else:
                # ON_COMPLETION
                if today.day != last_day:
                    continue

            # Idempotency guard: never create another month's invoices for the schedule.
            if Invoice.objects.filter(
                schedule=schedule,
                created_at__year=today.year,
                created_at__month=today.month,
            ).exists():
                schedule.last_run_at = now
                schedule.save(update_fields=["last_run_at"])
                InvoiceScheduleRun.objects.create(
                    schedule=schedule,
                    invoices_created=0,
                    status=RunStatus.PARTIAL,
                    triggered_by=triggered_by,
                )
                continue

            enrollments = (
                Enrollment.objects.filter(
                    class_obj=schedule.class_obj,
                    status=Enrollment.Status.ENROLLED,
                )
                .select_related("student", "student__parent")
            )
            qualifying_students = [e.student for e in enrollments]

            invoices_created = generate_invoices_for_schedule(schedule, qualifying_students)[
                "invoices_created"
            ]

            schedule.last_run_at = now
            schedule.save(update_fields=["last_run_at"])
            InvoiceScheduleRun.objects.create(
                schedule=schedule,
                invoices_created=invoices_created,
                status=RunStatus.SUCCEEDED,
                triggered_by=triggered_by,
            )
        except Exception as exc:
            logger.exception("evaluate_monthly_schedules failed for schedule_id=%s", schedule.id)
            schedule.last_run_at = now
            schedule.save(update_fields=["last_run_at"])
            InvoiceScheduleRun.objects.create(
                schedule=schedule,
                invoices_created=invoices_created,
                status=RunStatus.FAILED,
                triggered_by=triggered_by,
                error_detail=str(exc)[:4000],
            )


@shared_task
def run_invoice_schedules():
    evaluate_session_schedules.delay()
    evaluate_monthly_schedules.delay()

