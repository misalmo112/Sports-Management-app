"""Tests for rent pay schedule Celery tasks."""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.core.management import call_command
from django.conf import settings as django_settings
from django.test import TestCase
from django.utils import timezone
from django_celery_beat.models import PeriodicTask

from saas_platform.tenants.models import Academy
from tenant.attendance.models import Attendance
from tenant.classes.models import Class
from tenant.facilities.models import (
    FacilitySessionCycle,
    RentInvoice,
    RentPaySchedule,
    RentPayScheduleRun,
)
from tenant.facilities.tasks import (
    _generate_rent_invoice as real_generate_rent_invoice,
    evaluate_daily_rent_schedules,
    evaluate_monthly_rent_schedules,
    evaluate_session_rent_schedules,
    run_rent_pay_schedules,
)
from tenant.onboarding.models import Location
from tenant.students.models import Student


class RentMonthlyScheduleTaskTest(TestCase):
    def setUp(self):
        self.today = date(2026, 3, 15)
        self.academy = Academy.objects.create(
            name='Rent Academy',
            slug='rent-academy',
            email='rent@academy.test',
        )
        self.location = Location.objects.create(academy=self.academy, name='Court A')

    def _monthly_schedule(self, **kwargs):
        defaults = dict(
            academy=self.academy,
            location=self.location,
            billing_type=RentPaySchedule.BillingType.MONTHLY,
            amount=Decimal('5000.00'),
            currency='AED',
            billing_day=15,
            cycle_start_date=self.today.replace(day=1),
            is_active=True,
        )
        defaults.update(kwargs)
        return RentPaySchedule.objects.create(**defaults)

    def test_creates_draft_invoice_on_billing_day(self):
        schedule = self._monthly_schedule(due_date_offset_days=30)
        with patch('tenant.facilities.tasks.date') as m:
            m.today.return_value = self.today
            m.min = date.min
            evaluate_monthly_rent_schedules(schedule_id=schedule.id)

        inv = RentInvoice.objects.get(schedule=schedule)
        self.assertEqual(inv.status, RentInvoice.Status.DRAFT)
        self.assertEqual(inv.amount, Decimal('5000.00'))
        self.assertIn('March 2026', inv.period_description)
        self.assertIn('Court A', inv.period_description)
        self.assertEqual(inv.due_date, date(2026, 3, 1) + timedelta(days=30))

    def test_skips_when_billing_day_not_today_without_schedule_id(self):
        schedule = self._monthly_schedule(billing_day=14)
        with patch('tenant.facilities.tasks.date') as m:
            m.today.return_value = self.today
            m.min = date.min
            evaluate_monthly_rent_schedules()

        self.assertFalse(RentInvoice.objects.filter(schedule=schedule).exists())
        self.assertFalse(RentPayScheduleRun.objects.filter(schedule=schedule).exists())

    def test_idempotent_same_month(self):
        schedule = self._monthly_schedule()
        with patch('tenant.facilities.tasks.date') as m:
            m.today.return_value = self.today
            m.min = date.min
            evaluate_monthly_rent_schedules(schedule_id=schedule.id)
            evaluate_monthly_rent_schedules(schedule_id=schedule.id)

        self.assertEqual(RentInvoice.objects.filter(schedule=schedule).count(), 1)
        runs = RentPayScheduleRun.objects.filter(schedule=schedule).order_by('id')
        self.assertEqual(runs.count(), 2)
        self.assertEqual(runs[1].invoices_created, 0)


class RentDailyScheduleTaskTest(TestCase):
    def setUp(self):
        self.today = date(2026, 4, 10)
        self.academy = Academy.objects.create(
            name='Daily Academy',
            slug='daily-academy',
            email='daily@academy.test',
        )
        self.location = Location.objects.create(academy=self.academy, name='Pitch')

    def test_daily_creates_one_invoice_per_day(self):
        schedule = RentPaySchedule.objects.create(
            academy=self.academy,
            location=self.location,
            billing_type=RentPaySchedule.BillingType.DAILY,
            amount=Decimal('200.00'),
            currency='AED',
            cycle_start_date=self.today,
            is_active=True,
        )
        with patch('tenant.facilities.tasks.date') as m:
            m.today.return_value = self.today
            m.min = date.min
            evaluate_daily_rent_schedules(schedule_id=schedule.id)

        inv = RentInvoice.objects.get(schedule=schedule)
        self.assertEqual(inv.status, RentInvoice.Status.DRAFT)
        self.assertEqual(inv.issued_date, self.today)
        self.assertEqual(inv.amount, Decimal('200.00'))

    def test_daily_idempotent_same_day(self):
        schedule = RentPaySchedule.objects.create(
            academy=self.academy,
            location=self.location,
            billing_type=RentPaySchedule.BillingType.DAILY,
            amount=Decimal('100.00'),
            currency='AED',
            cycle_start_date=self.today,
            is_active=True,
        )
        with patch('tenant.facilities.tasks.date') as m:
            m.today.return_value = self.today
            m.min = date.min
            evaluate_daily_rent_schedules(schedule_id=schedule.id)
            evaluate_daily_rent_schedules(schedule_id=schedule.id)

        self.assertEqual(RentInvoice.objects.filter(schedule=schedule).count(), 1)


class RentSessionScheduleTaskTest(TestCase):
    def setUp(self):
        self.today = timezone.localdate()
        self.cycle_start = self.today - timedelta(days=30)
        self.academy = Academy.objects.create(
            name='Session Academy',
            slug='session-academy',
            email='session@academy.test',
        )
        self.location = Location.objects.create(academy=self.academy, name='Hall')
        self.student = Student.objects.create(
            academy=self.academy,
            first_name='S',
            last_name='T',
        )
        self.class_a = Class.objects.create(
            academy=self.academy,
            name='Class A',
            location=self.location,
            max_capacity=20,
        )
        self.class_b = Class.objects.create(
            academy=self.academy,
            name='Class B',
            location=self.location,
            max_capacity=20,
        )

    def _session_schedule(self, sessions_per_invoice=2, amount=Decimal('50.00')):
        return RentPaySchedule.objects.create(
            academy=self.academy,
            location=self.location,
            billing_type=RentPaySchedule.BillingType.SESSION,
            amount=amount,
            currency='AED',
            sessions_per_invoice=sessions_per_invoice,
            cycle_start_date=self.cycle_start,
            is_active=True,
        )

    def _attendance(self, class_obj, day):
        Attendance.objects.create(
            academy=self.academy,
            student=self.student,
            class_obj=class_obj,
            date=day,
            status=Attendance.Status.PRESENT,
        )

    def test_distinct_class_date_pairs_and_invoice_amount(self):
        schedule = self._session_schedule(sessions_per_invoice=2, amount=Decimal('40.00'))
        d1 = self.today - timedelta(days=3)
        self._attendance(self.class_a, d1)
        self._attendance(self.class_b, d1)

        evaluate_session_rent_schedules(schedule_id=schedule.id)

        inv = RentInvoice.objects.get(schedule=schedule)
        self.assertEqual(inv.amount, Decimal('80.00'))
        self.assertIn('2 sessions', inv.period_description)
        self.assertIn('40.00 AED', inv.period_description)

        closed = FacilitySessionCycle.objects.get(schedule=schedule, cycle_number=1)
        self.assertIsNotNone(closed.invoice)
        nxt = FacilitySessionCycle.objects.get(schedule=schedule, cycle_number=2)
        self.assertIsNone(nxt.invoice)

    def test_rerun_does_not_double_count(self):
        schedule = self._session_schedule(sessions_per_invoice=2)
        d1 = self.today - timedelta(days=5)
        self._attendance(self.class_a, d1)
        self._attendance(self.class_b, d1)

        evaluate_session_rent_schedules(schedule_id=schedule.id)
        evaluate_session_rent_schedules(schedule_id=schedule.id)

        self.assertEqual(RentInvoice.objects.filter(schedule=schedule).count(), 1)

    def test_failure_does_not_block_other_schedule(self):
        schedule_a = self._session_schedule(sessions_per_invoice=1, amount=Decimal('10.00'))
        other_loc = Location.objects.create(academy=self.academy, name='Other')
        schedule_b = RentPaySchedule.objects.create(
            academy=self.academy,
            location=other_loc,
            billing_type=RentPaySchedule.BillingType.SESSION,
            amount=Decimal('20.00'),
            currency='AED',
            sessions_per_invoice=1,
            cycle_start_date=self.cycle_start,
            is_active=True,
        )
        class_other = Class.objects.create(
            academy=self.academy,
            name='Other class',
            location=other_loc,
            max_capacity=10,
        )
        self._attendance(self.class_a, self.today - timedelta(days=1))
        self._attendance(class_other, self.today - timedelta(days=1))

        def boom(schedule, period_description, period_start, amount, issued_date=None):
            if schedule.id == schedule_a.id:
                raise RuntimeError('fail a')
            return real_generate_rent_invoice(
                schedule, period_description, period_start, amount, issued_date=issued_date
            )

        with patch('tenant.facilities.tasks._generate_rent_invoice', side_effect=boom):
            evaluate_session_rent_schedules()

        self.assertEqual(
            RentPayScheduleRun.objects.get(schedule=schedule_a).status,
            RentPayScheduleRun.RunStatus.FAILED,
        )
        self.assertTrue(RentInvoice.objects.filter(schedule=schedule_b).exists())


class RentPaySchedulesBeatTest(TestCase):
    def test_beat_registers_unified_task(self):
        call_command("seed_beat_schedule", verbosity=0)
        # Phase R.3 seeds only the four scheduled beat tasks explicitly listed in
        # the Phase R.3 spec; rent-pay schedules are not part of that set.
        self.assertFalse(
            PeriodicTask.objects.filter(
                task="tenant.facilities.tasks.run_rent_pay_schedules",
                enabled=True,
            ).exists()
        )

    def test_run_rent_pay_schedules_dispatches_three(self):
        with patch.object(evaluate_monthly_rent_schedules, 'delay') as m_m, patch.object(
            evaluate_daily_rent_schedules, 'delay'
        ) as m_d, patch.object(evaluate_session_rent_schedules, 'delay') as m_s:
            run_rent_pay_schedules()
        m_m.assert_called_once_with()
        m_d.assert_called_once_with()
        m_s.assert_called_once_with()
