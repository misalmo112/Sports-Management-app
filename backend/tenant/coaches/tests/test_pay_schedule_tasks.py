from __future__ import annotations

from contextlib import contextmanager
from datetime import date as real_date
from datetime import datetime as dt
from datetime import timezone as dt_timezone
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.conf import settings as django_settings
from django.test import TestCase
from django.utils import timezone

from saas_platform.tenants.models import Academy
from tenant.attendance.models import CoachAttendance
from tenant.classes.models import Class
from tenant.coaches.models import Coach, CoachSessionCycle, StaffInvoice, StaffPaySchedule, StaffPayScheduleRun
from tenant.coaches.tasks import (
    evaluate_monthly_pay_schedules,
    evaluate_session_pay_schedules,
    evaluate_weekly_pay_schedules,
    run_staff_pay_schedules,
)


class SessionPayScheduleTaskTest(TestCase):
    def setUp(self):
        self.today = timezone.localdate()
        self.cycle_start = self.today - timedelta(days=14)

        self.academy = Academy.objects.create(
            name="Coach Academy",
            slug="coach-academy",
            email="coach@academy.test",
            currency="USD",
        )
        self.coach = Coach.objects.create(
            academy=self.academy,
            first_name="Mina",
            last_name="Coach",
            email="mina@coach.test",
        )
        self.other_coach = Coach.objects.create(
            academy=self.academy,
            first_name="Other",
            last_name="Coach",
            email="other@coach.test",
        )
        self.class_a = Class.objects.create(
            academy=self.academy,
            name="Class A",
            coach=self.coach,
            max_capacity=20,
        )
        self.class_b = Class.objects.create(
            academy=self.academy,
            name="Class B",
            coach=self.coach,
            max_capacity=20,
        )
        self.class_other = Class.objects.create(
            academy=self.academy,
            name="Class Other",
            coach=self.other_coach,
            max_capacity=20,
        )

    def _create_schedule(
        self,
        *,
        coach=None,
        class_scope=None,
        sessions_per_cycle=2,
        amount=Decimal("250.00"),
    ):
        coach = coach or self.coach
        return StaffPaySchedule.objects.create(
            academy=self.academy,
            coach=coach,
            billing_type=StaffPaySchedule.BillingType.SESSION,
            amount=amount,
            sessions_per_cycle=sessions_per_cycle,
            class_scope=class_scope,
            cycle_start_date=self.cycle_start,
            is_active=True,
        )

    def _mark_present(self, *, coach=None, class_obj=None, day_offset=0):
        coach = coach or self.coach
        class_obj = class_obj or self.class_a
        CoachAttendance.objects.create(
            academy=self.academy,
            coach=coach,
            class_obj=class_obj,
            date=self.today - timedelta(days=day_offset),
            status=CoachAttendance.Status.PRESENT,
        )

    def test_creates_invoice_closes_cycle_and_records_successful_run(self):
        schedule = self._create_schedule(sessions_per_cycle=2, amount=Decimal("175.00"))
        self._mark_present(class_obj=self.class_a, day_offset=5)
        self._mark_present(class_obj=self.class_b, day_offset=4)

        evaluate_session_pay_schedules(schedule_id=schedule.id)

        invoice = StaffInvoice.objects.get(schedule=schedule)
        self.assertEqual(invoice.status, StaffInvoice.Status.DRAFT)
        self.assertEqual(invoice.amount, Decimal("175.00"))
        self.assertEqual(invoice.period_type, StaffPaySchedule.BillingType.SESSION)
        self.assertEqual(invoice.schedule_id, schedule.id)
        self.assertEqual(invoice.currency, "USD")

        closed_cycle = CoachSessionCycle.objects.get(schedule=schedule, cycle_number=1)
        self.assertEqual(closed_cycle.sessions_counted, 2)
        self.assertIsNotNone(closed_cycle.invoice)

        next_cycle = CoachSessionCycle.objects.get(schedule=schedule, cycle_number=2)
        self.assertIsNone(next_cycle.invoice)
        self.assertEqual(next_cycle.sessions_counted, 0)
        self.assertEqual(next_cycle.last_counted_date, closed_cycle.last_counted_date)

        run = StaffPayScheduleRun.objects.get(schedule=schedule)
        self.assertEqual(run.status, StaffPayScheduleRun.RunStatus.SUCCEEDED)
        self.assertEqual(run.invoices_created, 1)
        self.assertEqual(run.triggered_by, StaffPayScheduleRun.TriggerSource.SCHEDULED)

    def test_class_scope_null_counts_only_assigned_classes(self):
        schedule = self._create_schedule(sessions_per_cycle=2, class_scope=None)

        # Counted: classes assigned to this coach.
        self._mark_present(class_obj=self.class_a, day_offset=5)
        self._mark_present(class_obj=self.class_b, day_offset=4)
        # Not counted: class assigned to another coach.
        self._mark_present(class_obj=self.class_other, day_offset=3)

        evaluate_session_pay_schedules(schedule_id=schedule.id)

        cycle = CoachSessionCycle.objects.get(schedule=schedule, cycle_number=1)
        self.assertEqual(cycle.sessions_counted, 2)
        self.assertTrue(StaffInvoice.objects.filter(schedule=schedule).exists())

    def test_class_scope_set_counts_only_that_class(self):
        schedule = self._create_schedule(sessions_per_cycle=2, class_scope=self.class_a)

        self._mark_present(class_obj=self.class_a, day_offset=5)
        self._mark_present(class_obj=self.class_b, day_offset=4)  # Must be ignored.

        evaluate_session_pay_schedules(schedule_id=schedule.id)

        cycle = CoachSessionCycle.objects.get(schedule=schedule, cycle_number=1)
        self.assertEqual(cycle.sessions_counted, 1)
        self.assertFalse(StaffInvoice.objects.filter(schedule=schedule).exists())

    def test_immediate_rerun_does_not_duplicate_invoice(self):
        schedule = self._create_schedule(sessions_per_cycle=1)
        self._mark_present(class_obj=self.class_a, day_offset=5)

        evaluate_session_pay_schedules(schedule_id=schedule.id)
        first_invoice_count = StaffInvoice.objects.filter(schedule=schedule).count()

        evaluate_session_pay_schedules(schedule_id=schedule.id)

        self.assertEqual(StaffInvoice.objects.filter(schedule=schedule).count(), first_invoice_count)
        self.assertEqual(StaffInvoice.objects.filter(schedule=schedule).count(), 1)
        self.assertEqual(StaffPayScheduleRun.objects.filter(schedule=schedule).count(), 2)
        last_run = StaffPayScheduleRun.objects.filter(schedule=schedule).order_by("-id").first()
        self.assertEqual(last_run.status, StaffPayScheduleRun.RunStatus.SUCCEEDED)
        self.assertEqual(last_run.invoices_created, 0)

    def test_schedule_failure_does_not_block_other_schedules(self):
        schedule_a = self._create_schedule(sessions_per_cycle=1, coach=self.coach)
        schedule_b = self._create_schedule(sessions_per_cycle=1, coach=self.other_coach, amount=Decimal("300.00"))

        self._mark_present(coach=self.coach, class_obj=self.class_a, day_offset=5)
        self._mark_present(coach=self.other_coach, class_obj=self.class_other, day_offset=5)

        real_generate_staff_invoice = None

        def side_effect(schedule, period_description, period_start):
            nonlocal real_generate_staff_invoice
            if real_generate_staff_invoice is None:
                from tenant.coaches.pay_schedule_service import generate_staff_invoice as real_service

                real_generate_staff_invoice = real_service
            if schedule.id == schedule_a.id:
                raise RuntimeError("Simulated schedule A invoice failure")
            return real_generate_staff_invoice(schedule, period_description, period_start)

        with patch("tenant.coaches.tasks.generate_staff_invoice", side_effect=side_effect):
            evaluate_session_pay_schedules()

        run_a = StaffPayScheduleRun.objects.get(schedule=schedule_a)
        self.assertEqual(run_a.status, StaffPayScheduleRun.RunStatus.FAILED)
        self.assertEqual(StaffInvoice.objects.filter(schedule=schedule_a).count(), 0)

        run_b = StaffPayScheduleRun.objects.get(schedule=schedule_b)
        self.assertEqual(run_b.status, StaffPayScheduleRun.RunStatus.SUCCEEDED)
        self.assertEqual(run_b.invoices_created, 1)
        self.assertEqual(StaffInvoice.objects.filter(schedule=schedule_b).count(), 1)


class TimeBasedStaffPayScheduleTaskTest(TestCase):
    def setUp(self):
        self.today = timezone.now().date()
        if self.today.day > 28:
            self.today = self.today.replace(day=28)
        self.cycle_start = self.today - timedelta(days=30)

        self.academy = Academy.objects.create(
            name="Payroll Academy",
            slug="payroll-academy",
            email="payroll@academy.test",
            currency="USD",
        )
        self.coach = Coach.objects.create(
            academy=self.academy,
            first_name="Lina",
            last_name="Coach",
            email="lina@coach.test",
        )

    def _create_monthly_schedule(self, *, billing_day: int):
        return StaffPaySchedule.objects.create(
            academy=self.academy,
            coach=self.coach,
            billing_type=StaffPaySchedule.BillingType.MONTHLY,
            amount=Decimal("1000.00"),
            billing_day=billing_day,
            cycle_start_date=self.cycle_start,
            is_active=True,
        )

    def _create_weekly_schedule(self, *, billing_day_of_week: int):
        return StaffPaySchedule.objects.create(
            academy=self.academy,
            coach=self.coach,
            billing_type=StaffPaySchedule.BillingType.WEEKLY,
            amount=Decimal("300.00"),
            billing_day_of_week=billing_day_of_week,
            cycle_start_date=self.cycle_start,
            is_active=True,
        )

    def _patch_tasks_today(self, fake_today):
        class FakeDate(real_date):
            @classmethod
            def today(cls):
                return fake_today

        fake_now = dt(fake_today.year, fake_today.month, fake_today.day, 12, 0, 0, tzinfo=dt_timezone.utc)

        @contextmanager
        def _ctx():
            with patch("django.utils.timezone.now", return_value=fake_now), patch("tenant.coaches.tasks.date", FakeDate):
                yield

        return _ctx()

    def test_monthly_fires_only_on_billing_day(self):
        schedule = self._create_monthly_schedule(billing_day=self.today.day)

        with self._patch_tasks_today(self.today):
            evaluate_monthly_pay_schedules()

        self.assertEqual(StaffInvoice.objects.filter(schedule=schedule).count(), 1)
        run = StaffPayScheduleRun.objects.get(schedule=schedule)
        self.assertEqual(run.status, StaffPayScheduleRun.RunStatus.SUCCEEDED)
        self.assertEqual(run.invoices_created, 1)

    def test_monthly_non_billing_day_creates_none(self):
        non_today_day = 1 if self.today.day != 1 else 2
        schedule = self._create_monthly_schedule(billing_day=non_today_day)

        with self._patch_tasks_today(self.today):
            evaluate_monthly_pay_schedules()

        self.assertEqual(StaffInvoice.objects.filter(schedule=schedule).count(), 0)
        self.assertEqual(StaffPayScheduleRun.objects.filter(schedule=schedule).count(), 0)
        schedule.refresh_from_db()
        self.assertIsNone(schedule.last_run_at)

    def test_monthly_rerun_same_month_has_no_duplicate(self):
        schedule = self._create_monthly_schedule(billing_day=self.today.day)

        with self._patch_tasks_today(self.today):
            evaluate_monthly_pay_schedules()
            evaluate_monthly_pay_schedules()

        self.assertEqual(StaffInvoice.objects.filter(schedule=schedule).count(), 1)
        runs = list(StaffPayScheduleRun.objects.filter(schedule=schedule).order_by("id"))
        self.assertEqual(len(runs), 2)
        self.assertEqual(runs[1].status, StaffPayScheduleRun.RunStatus.SUCCEEDED)
        self.assertEqual(runs[1].invoices_created, 0)

    def test_weekly_fires_only_on_matching_weekday(self):
        schedule = self._create_weekly_schedule(billing_day_of_week=self.today.weekday())

        with self._patch_tasks_today(self.today):
            evaluate_weekly_pay_schedules()

        self.assertEqual(StaffInvoice.objects.filter(schedule=schedule).count(), 1)
        run = StaffPayScheduleRun.objects.get(schedule=schedule)
        self.assertEqual(run.status, StaffPayScheduleRun.RunStatus.SUCCEEDED)
        self.assertEqual(run.invoices_created, 1)

    def test_weekly_period_start_is_monday(self):
        wednesday = real_date(2026, 3, 25)
        schedule = self._create_weekly_schedule(billing_day_of_week=wednesday.weekday())

        with self._patch_tasks_today(wednesday):
            evaluate_weekly_pay_schedules()

        invoice = StaffInvoice.objects.get(schedule=schedule)
        self.assertEqual(invoice.period_start.weekday(), 0)
        self.assertEqual(invoice.period_start, real_date(2026, 3, 23))

    def test_weekly_rerun_same_week_has_no_duplicate(self):
        schedule = self._create_weekly_schedule(billing_day_of_week=self.today.weekday())

        with self._patch_tasks_today(self.today):
            evaluate_weekly_pay_schedules()
            evaluate_weekly_pay_schedules()

        self.assertEqual(StaffInvoice.objects.filter(schedule=schedule).count(), 1)
        runs = list(StaffPayScheduleRun.objects.filter(schedule=schedule).order_by("id"))
        self.assertEqual(len(runs), 2)
        self.assertEqual(runs[1].status, StaffPayScheduleRun.RunStatus.SUCCEEDED)
        self.assertEqual(runs[1].invoices_created, 0)

    def test_run_staff_pay_schedules_calls_all_three_tasks(self):
        with patch("tenant.coaches.tasks.evaluate_session_pay_schedules.delay") as session_delay, patch(
            "tenant.coaches.tasks.evaluate_monthly_pay_schedules.delay"
        ) as monthly_delay, patch("tenant.coaches.tasks.evaluate_weekly_pay_schedules.delay") as weekly_delay:
            run_staff_pay_schedules()
            session_delay.assert_called_once()
            monthly_delay.assert_called_once()
            weekly_delay.assert_called_once()

    def test_beat_entry_registered_for_staff_pay_schedules(self):
        self.assertIn("run-staff-pay-schedules", django_settings.CELERY_BEAT_SCHEDULE)
        entry = django_settings.CELERY_BEAT_SCHEDULE["run-staff-pay-schedules"]
        self.assertEqual(entry["task"], "tenant.coaches.tasks.run_staff_pay_schedules")
        self.assertIn("schedule", entry)
