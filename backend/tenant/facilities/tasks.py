"""Celery tasks for facility rent pay schedule automation."""

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

from django.db.models import Max
from django.utils import timezone

from tenant.attendance.models import Attendance
from tenant.classes.models import Class
from tenant.facilities.models import (
    FacilitySessionCycle,
    RentInvoice,
    RentPaySchedule,
    RentPayScheduleRun,
)
from tenant.facilities.services import FacilitiesService

logger = logging.getLogger(__name__)


def _generate_rent_invoice(schedule, period_description, period_start, amount, issued_date=None):
    issue = issued_date if issued_date is not None else timezone.now().date()
    due_date = period_start + timedelta(days=schedule.due_date_offset_days)

    invoice = FacilitiesService.create_rent_invoice(
        academy=schedule.academy,
        location=schedule.location,
        amount=amount,
        currency=schedule.currency,
        period_description=period_description,
        issued_date=issue,
        due_date=due_date,
        status=RentInvoice.Status.DRAFT,
    )
    invoice.schedule = schedule
    invoice.save(update_fields=['schedule', 'updated_at'])
    return invoice


def _get_or_create_open_facility_session_cycle(schedule):
    cycle = (
        FacilitySessionCycle.objects.filter(schedule=schedule, invoice__isnull=True)
        .order_by('-cycle_number')
        .first()
    )
    if cycle is not None:
        return cycle
    latest = FacilitySessionCycle.objects.filter(schedule=schedule).order_by('-cycle_number').first()
    next_num = (latest.cycle_number + 1) if latest else 1
    return FacilitySessionCycle.objects.create(
        schedule=schedule,
        cycle_number=next_num,
        sessions_counted=0,
    )


@shared_task
def evaluate_monthly_rent_schedules(
    schedule_id=None,
    triggered_by=RentPayScheduleRun.TriggerSource.SCHEDULED,
):
    today = date.today()
    base = RentPaySchedule.objects.filter(
        billing_type=RentPaySchedule.BillingType.MONTHLY,
        is_active=True,
        cycle_start_date__lte=today,
    ).select_related('academy', 'location')
    if schedule_id is not None:
        schedules = base.filter(id=schedule_id)
    else:
        schedules = base.filter(billing_day=today.day)

    for schedule in schedules:
        invoices_created = 0
        try:
            if RentInvoice.objects.filter(
                schedule=schedule,
                created_at__year=today.year,
                created_at__month=today.month,
            ).exists():
                RentPayScheduleRun.objects.create(
                    schedule=schedule,
                    invoices_created=0,
                    status=RentPayScheduleRun.RunStatus.SUCCEEDED,
                    triggered_by=triggered_by,
                )
                schedule.last_run_at = timezone.now()
                schedule.save(update_fields=['last_run_at', 'updated_at'])
                continue

            period_description = (
                f"{today.strftime('%B %Y')} — {schedule.location.name} Monthly Rent"
            )
            _generate_rent_invoice(
                schedule,
                period_description,
                period_start=today.replace(day=1),
                amount=schedule.amount,
                issued_date=today,
            )
            invoices_created = 1
            schedule.last_run_at = timezone.now()
            schedule.save(update_fields=['last_run_at', 'updated_at'])
            RentPayScheduleRun.objects.create(
                schedule=schedule,
                invoices_created=invoices_created,
                status=RentPayScheduleRun.RunStatus.SUCCEEDED,
                triggered_by=triggered_by,
            )
        except Exception as exc:  # noqa: BLE001 — isolate per schedule
            logger.exception('Monthly rent schedule %s failed', schedule.pk)
            RentPayScheduleRun.objects.create(
                schedule=schedule,
                invoices_created=0,
                status=RentPayScheduleRun.RunStatus.FAILED,
                triggered_by=triggered_by,
                error_detail=str(exc),
            )


@shared_task
def evaluate_daily_rent_schedules(
    schedule_id=None,
    triggered_by=RentPayScheduleRun.TriggerSource.SCHEDULED,
):
    today = date.today()
    schedules = RentPaySchedule.objects.filter(
        billing_type=RentPaySchedule.BillingType.DAILY,
        is_active=True,
        cycle_start_date__lte=today,
    ).select_related('academy', 'location')
    if schedule_id is not None:
        schedules = schedules.filter(id=schedule_id)

    for schedule in schedules:
        try:
            if RentInvoice.objects.filter(schedule=schedule, issued_date=today).exists():
                RentPayScheduleRun.objects.create(
                    schedule=schedule,
                    invoices_created=0,
                    status=RentPayScheduleRun.RunStatus.SUCCEEDED,
                    triggered_by=triggered_by,
                )
                schedule.last_run_at = timezone.now()
                schedule.save(update_fields=['last_run_at', 'updated_at'])
                continue

            period_description = f"{today.strftime('%d %b %Y')} — {schedule.location.name} Daily Hire"
            _generate_rent_invoice(
                schedule,
                period_description,
                period_start=today,
                amount=schedule.amount,
                issued_date=today,
            )
            schedule.last_run_at = timezone.now()
            schedule.save(update_fields=['last_run_at', 'updated_at'])
            RentPayScheduleRun.objects.create(
                schedule=schedule,
                invoices_created=1,
                status=RentPayScheduleRun.RunStatus.SUCCEEDED,
                triggered_by=triggered_by,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception('Daily rent schedule %s failed', schedule.pk)
            RentPayScheduleRun.objects.create(
                schedule=schedule,
                invoices_created=0,
                status=RentPayScheduleRun.RunStatus.FAILED,
                triggered_by=triggered_by,
                error_detail=str(exc),
            )


@shared_task
def evaluate_session_rent_schedules(
    schedule_id=None,
    triggered_by=RentPayScheduleRun.TriggerSource.SCHEDULED,
):
    schedules = RentPaySchedule.objects.filter(
        billing_type=RentPaySchedule.BillingType.SESSION,
        is_active=True,
    ).select_related('academy', 'location')
    if schedule_id is not None:
        schedules = schedules.filter(id=schedule_id)

    for schedule in schedules:
        invoices_created = 0
        try:
            cycle = _get_or_create_open_facility_session_cycle(schedule)

            class_ids = list(
                Class.objects.filter(
                    location=schedule.location,
                    academy=schedule.academy,
                ).values_list('id', flat=True)
            )

            date_floor = cycle.last_counted_date or date.min
            base_att = Attendance.objects.filter(
                academy=schedule.academy,
                class_obj_id__in=class_ids,
                date__gte=schedule.cycle_start_date,
                date__gt=date_floor,
            )

            new_sessions = (
                base_att.values('class_obj_id', 'date').distinct().count() if class_ids else 0
            )

            if new_sessions > 0:
                max_date = base_att.aggregate(m=Max('date'))['m']
                cycle.sessions_counted += new_sessions
                cycle.last_counted_date = max_date
                cycle.save(update_fields=['sessions_counted', 'last_counted_date', 'updated_at'])

            threshold = schedule.sessions_per_invoice or 0
            if cycle.sessions_counted >= threshold > 0:
                invoice_amount = cycle.sessions_counted * schedule.amount
                period_description = (
                    f"Sessions cycle {cycle.cycle_number} "
                    f"({cycle.sessions_counted} sessions × {schedule.amount} {schedule.currency})"
                    f" — {schedule.location.name}"
                )
                invoice = _generate_rent_invoice(
                    schedule,
                    period_description,
                    period_start=schedule.cycle_start_date,
                    amount=invoice_amount,
                    issued_date=date.today(),
                )
                cycle.invoice = invoice
                cycle.save(update_fields=['invoice', 'updated_at'])
                FacilitySessionCycle.objects.create(
                    schedule=schedule,
                    cycle_number=cycle.cycle_number + 1,
                    sessions_counted=0,
                    last_counted_date=cycle.last_counted_date,
                )
                invoices_created = 1

            schedule.last_run_at = timezone.now()
            schedule.save(update_fields=['last_run_at', 'updated_at'])
            RentPayScheduleRun.objects.create(
                schedule=schedule,
                invoices_created=invoices_created,
                status=RentPayScheduleRun.RunStatus.SUCCEEDED,
                triggered_by=triggered_by,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception('Session rent schedule %s failed', schedule.pk)
            RentPayScheduleRun.objects.create(
                schedule=schedule,
                invoices_created=0,
                status=RentPayScheduleRun.RunStatus.FAILED,
                triggered_by=triggered_by,
                error_detail=str(exc),
            )


@shared_task
def run_rent_pay_schedules():
    evaluate_monthly_rent_schedules.delay()
    evaluate_daily_rent_schedules.delay()
    evaluate_session_rent_schedules.delay()
