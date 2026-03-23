"""Celery tasks for coach staff pay schedule automation."""

from __future__ import annotations

import logging
from datetime import date, timedelta

try:
    from celery import shared_task
except ModuleNotFoundError:  # pragma: no cover
    def shared_task(func=None, **_kwargs):
        if func is None:
            def decorator(f):
                def _delay(*args, **kwargs):
                    return f(*args, **kwargs)

                f.delay = _delay
                return f
            return decorator

        def _delay(*args, **kwargs):
            return func(*args, **kwargs)

        func.delay = _delay
        return func

from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from tenant.attendance.models import CoachAttendance
from tenant.coaches.models import CoachSessionCycle, StaffInvoice, StaffPaySchedule, StaffPayScheduleRun
from tenant.coaches.pay_schedule_service import generate_staff_invoice

logger = logging.getLogger(__name__)


def _build_period_description(schedule, cycle):
    return f"Sessions {cycle.cycle_number} - {cycle.sessions_counted} sessions"


@shared_task
def evaluate_session_pay_schedules(schedule_id=None):
    """
    Evaluate SESSION staff pay schedules and generate invoices when thresholds are reached.

    Processing is isolated per schedule so one failure does not block others.
    """
    schedules = StaffPaySchedule.objects.filter(
        billing_type=StaffPaySchedule.BillingType.SESSION,
        is_active=True,
    ).select_related("academy", "coach", "class_scope")
    if schedule_id is not None:
        schedules = schedules.filter(id=schedule_id)

    for schedule in schedules:
        invoices_created = 0
        try:
            with transaction.atomic():
                cycle = (
                    CoachSessionCycle.objects.select_for_update()
                    .filter(schedule=schedule, coach=schedule.coach, invoice__isnull=True)
                    .order_by("-cycle_number")
                    .first()
                )

                if cycle is None:
                    latest_cycle = (
                        CoachSessionCycle.objects.filter(schedule=schedule, coach=schedule.coach)
                        .order_by("-cycle_number")
                        .first()
                    )
                    cycle = CoachSessionCycle.objects.create(
                        schedule=schedule,
                        coach=schedule.coach,
                        cycle_number=(latest_cycle.cycle_number + 1) if latest_cycle else 1,
                        sessions_counted=0,
                    )

                attendance_filters = {
                    "coach": schedule.coach,
                    "date__gte": schedule.cycle_start_date,
                    "status": CoachAttendance.Status.PRESENT,
                }
                if cycle.last_counted_date is not None:
                    attendance_filters["date__gt"] = cycle.last_counted_date
                if schedule.class_scope_id is not None:
                    attendance_filters["class_obj"] = schedule.class_scope
                else:
                    attendance_filters["class_obj__coach"] = schedule.coach

                delta_qs = CoachAttendance.objects.filter(**attendance_filters)
                delta_count = delta_qs.count()

                if delta_count > 0:
                    max_date = delta_qs.aggregate(max_date=Max("date"))["max_date"]
                    cycle.sessions_counted = cycle.sessions_counted + delta_count
                    cycle.last_counted_date = max_date
                    cycle.save(update_fields=["sessions_counted", "last_counted_date", "updated_at"])

                if cycle.sessions_counted >= schedule.sessions_per_cycle:
                    invoice = generate_staff_invoice(
                        schedule=schedule,
                        period_description=_build_period_description(schedule, cycle),
                        period_start=timezone.localdate(),
                    )
                    cycle.invoice = invoice
                    cycle.save(update_fields=["invoice", "updated_at"])
                    CoachSessionCycle.objects.create(
                        schedule=schedule,
                        coach=schedule.coach,
                        cycle_number=cycle.cycle_number + 1,
                        sessions_counted=0,
                        last_counted_date=cycle.last_counted_date,
                    )
                    invoices_created = 1

            schedule.last_run_at = timezone.now()
            schedule.save(update_fields=["last_run_at", "updated_at"])
            StaffPayScheduleRun.objects.create(
                schedule=schedule,
                status=StaffPayScheduleRun.RunStatus.SUCCEEDED,
                invoices_created=invoices_created,
                triggered_by=StaffPayScheduleRun.TriggerSource.SCHEDULED,
            )
        except Exception as exc:
            logger.exception("evaluate_session_pay_schedules failed for schedule_id=%s", schedule.id)
            schedule.last_run_at = timezone.now()
            schedule.save(update_fields=["last_run_at", "updated_at"])
            StaffPayScheduleRun.objects.create(
                schedule=schedule,
                status=StaffPayScheduleRun.RunStatus.FAILED,
                invoices_created=invoices_created,
                triggered_by=StaffPayScheduleRun.TriggerSource.SCHEDULED,
                error_detail=str(exc)[:4000],
            )


@shared_task
def evaluate_monthly_pay_schedules(schedule_id=None):
    """Evaluate MONTHLY staff pay schedules and generate monthly invoices."""
    today = date.today()
    schedules = StaffPaySchedule.objects.filter(
        billing_type=StaffPaySchedule.BillingType.MONTHLY,
        is_active=True,
        billing_day=today.day,
        cycle_start_date__lte=today,
    ).select_related("academy", "coach")
    if schedule_id is not None:
        schedules = schedules.filter(id=schedule_id)

    for schedule in schedules:
        invoices_created = 0
        try:
            with transaction.atomic():
                invoice_exists_this_month = StaffInvoice.objects.filter(
                    schedule=schedule,
                    created_at__year=today.year,
                    created_at__month=today.month,
                ).exists()
                if not invoice_exists_this_month:
                    generate_staff_invoice(
                        schedule=schedule,
                        period_description=today.strftime("%B %Y - Monthly Salary"),
                        period_start=today.replace(day=1),
                    )
                    invoices_created = 1

            schedule.last_run_at = timezone.now()
            schedule.save(update_fields=["last_run_at", "updated_at"])
            StaffPayScheduleRun.objects.create(
                schedule=schedule,
                status=StaffPayScheduleRun.RunStatus.SUCCEEDED,
                invoices_created=invoices_created,
                triggered_by=StaffPayScheduleRun.TriggerSource.SCHEDULED,
            )
        except Exception as exc:
            logger.exception("evaluate_monthly_pay_schedules failed for schedule_id=%s", schedule.id)
            schedule.last_run_at = timezone.now()
            schedule.save(update_fields=["last_run_at", "updated_at"])
            StaffPayScheduleRun.objects.create(
                schedule=schedule,
                status=StaffPayScheduleRun.RunStatus.FAILED,
                invoices_created=invoices_created,
                triggered_by=StaffPayScheduleRun.TriggerSource.SCHEDULED,
                error_detail=str(exc)[:4000],
            )


@shared_task
def evaluate_weekly_pay_schedules(schedule_id=None):
    """Evaluate WEEKLY staff pay schedules and generate weekly invoices."""
    today = date.today()
    today_weekday = today.weekday()
    week_start = today - timedelta(days=today_weekday)
    week_end = week_start + timedelta(days=6)

    schedules = StaffPaySchedule.objects.filter(
        billing_type=StaffPaySchedule.BillingType.WEEKLY,
        is_active=True,
        billing_day_of_week=today_weekday,
        cycle_start_date__lte=today,
    ).select_related("academy", "coach")
    if schedule_id is not None:
        schedules = schedules.filter(id=schedule_id)

    for schedule in schedules:
        invoices_created = 0
        try:
            with transaction.atomic():
                invoice_exists_for_week = StaffInvoice.objects.filter(
                    schedule=schedule,
                    period_start=week_start,
                ).exists()
                if not invoice_exists_for_week:
                    generate_staff_invoice(
                        schedule=schedule,
                        period_description=f"Week {week_start:%d %b}-{week_end:%d %b %Y}",
                        period_start=week_start,
                    )
                    invoices_created = 1

            schedule.last_run_at = timezone.now()
            schedule.save(update_fields=["last_run_at", "updated_at"])
            StaffPayScheduleRun.objects.create(
                schedule=schedule,
                status=StaffPayScheduleRun.RunStatus.SUCCEEDED,
                invoices_created=invoices_created,
                triggered_by=StaffPayScheduleRun.TriggerSource.SCHEDULED,
            )
        except Exception as exc:
            logger.exception("evaluate_weekly_pay_schedules failed for schedule_id=%s", schedule.id)
            schedule.last_run_at = timezone.now()
            schedule.save(update_fields=["last_run_at", "updated_at"])
            StaffPayScheduleRun.objects.create(
                schedule=schedule,
                status=StaffPayScheduleRun.RunStatus.FAILED,
                invoices_created=invoices_created,
                triggered_by=StaffPayScheduleRun.TriggerSource.SCHEDULED,
                error_detail=str(exc)[:4000],
            )


@shared_task
def run_staff_pay_schedules():
    """Fan-out scheduler task for all staff pay schedule evaluators."""
    evaluate_session_pay_schedules.delay()
    evaluate_monthly_pay_schedules.delay()
    evaluate_weekly_pay_schedules.delay()
