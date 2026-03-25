from __future__ import annotations

from datetime import date as real_date
from datetime import datetime as dt
from datetime import timezone as dt_timezone
from datetime import timedelta
from decimal import Decimal
from contextlib import contextmanager
from unittest.mock import patch

from django.core.management import call_command
from django.conf import settings as django_settings
from django.test import TestCase
from django.utils import timezone
from django_celery_beat.models import PeriodicTask

from saas_platform.tenants.models import Academy
from tenant.billing.models import (
    BillingType,
    DiscountType,
    Invoice,
    InvoiceItem,
    InvoiceSchedule,
    InvoiceScheduleRun,
    Item,
    RunStatus,
    TriggerSource,
)
from tenant.billing.tasks import evaluate_monthly_schedules, run_invoice_schedules
from tenant.classes.models import Class, Enrollment
from tenant.onboarding.models import Location, Sport
from tenant.students.models import Parent, Student
from tenant.billing.models import StudentScheduleOverride


class MonthlyInvoiceScheduleTaskTest(TestCase):
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
            onboarding_completed=True,
        )

        self.sport = Sport.objects.create(
            academy=self.academy,
            name="Football",
            description="Football training",
        )
        self.location = Location.objects.create(
            academy=self.academy,
            name="Main Field",
        )
        self.class_obj = Class.objects.create(
            academy=self.academy,
            name="U10 Football",
            description="U10 training",
            sport=self.sport,
            location=self.location,
            max_capacity=20,
        )

        self.billing_item = Item.objects.create(
            academy=self.academy,
            name="Monthly Fee",
            description="Monthly fee",
            price=Decimal("100.00"),
            currency="USD",
        )

        # billing_day is validated to be <= 28, so keep a deterministic "today"
        # that will always be a valid billing_day.
        self.today = timezone.now().date()
        if self.today.day > 28:
            self.today = self.today.replace(day=28)
        self.cycle_start_date = self.today - timedelta(days=10)

    def _create_student(self, *, parent: Parent, first_name: str) -> Student:
        return Student.objects.create(
            academy=self.academy,
            parent=parent,
            first_name=first_name,
            last_name="Student",
            is_active=True,
        )

    def _create_enrollment(self, *, student: Student, status: Enrollment.Status = Enrollment.Status.ENROLLED):
        return Enrollment.objects.create(
            academy=self.academy,
            student=student,
            class_obj=self.class_obj,
            status=status,
        )

    def _patch_tasks_today(self):
        """
        Patch tenant.billing.tasks.date.today() and django.utils.timezone.now()
        so both the schedule filters and service override logic see the same "today".
        """
        fake_today = self.today

        class FakeDate(real_date):
            @classmethod
            def today(cls):
                return fake_today

        fake_now = dt(fake_today.year, fake_today.month, fake_today.day, 12, 0, 0, tzinfo=dt_timezone.utc)

        @contextmanager
        def _ctx():
            with patch("django.utils.timezone.now", return_value=fake_now), patch(
                "tenant.billing.tasks.date",
                FakeDate,
            ):
                yield

        return _ctx()

    def test_fires_only_when_billing_day_matches_today(self):
        parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com",
        )
        student = self._create_student(parent=parent, first_name="Alice")
        self._create_enrollment(student=student)

        schedule = InvoiceSchedule.objects.create(
            academy=self.academy,
            class_obj=self.class_obj,
            billing_item=self.billing_item,
            billing_type=BillingType.MONTHLY,
            billing_day=self.today.day,
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )

        with self._patch_tasks_today():
            evaluate_monthly_schedules()

        self.assertTrue(Invoice.objects.filter(schedule=schedule, parent=parent).exists())
        run = InvoiceScheduleRun.objects.get(schedule=schedule)
        self.assertEqual(run.status, RunStatus.SUCCEEDED)
        self.assertEqual(run.triggered_by, TriggerSource.SCHEDULED)
        self.assertEqual(run.invoices_created, 1)

    def test_running_on_non_billing_day_does_nothing(self):
        non_today_day = 1 if self.today.day != 1 else 2
        parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com",
        )
        student = self._create_student(parent=parent, first_name="Alice")
        self._create_enrollment(student=student)

        schedule = InvoiceSchedule.objects.create(
            academy=self.academy,
            class_obj=self.class_obj,
            billing_item=self.billing_item,
            billing_type=BillingType.MONTHLY,
            billing_day=non_today_day,
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )

        with self._patch_tasks_today():
            evaluate_monthly_schedules()

        self.assertEqual(Invoice.objects.count(), 0)
        self.assertEqual(InvoiceScheduleRun.objects.count(), 0)
        schedule.refresh_from_db()
        self.assertIsNone(schedule.last_run_at)

    def test_re_running_same_billing_day_does_not_duplicate_invoices(self):
        parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com",
        )
        student = self._create_student(parent=parent, first_name="Alice")
        self._create_enrollment(student=student)

        schedule = InvoiceSchedule.objects.create(
            academy=self.academy,
            class_obj=self.class_obj,
            billing_item=self.billing_item,
            billing_type=BillingType.MONTHLY,
            billing_day=self.today.day,
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )

        with self._patch_tasks_today():
            evaluate_monthly_schedules()
            first_invoice_count = Invoice.objects.count()
            first_run = InvoiceScheduleRun.objects.get(schedule=schedule)
            self.assertEqual(first_run.status, RunStatus.SUCCEEDED)

            # Rerun on the same (patched) "today".
            evaluate_monthly_schedules()

        self.assertEqual(Invoice.objects.count(), first_invoice_count)

        runs = list(InvoiceScheduleRun.objects.filter(schedule=schedule).order_by("id"))
        self.assertEqual(len(runs), 2)
        self.assertEqual(runs[1].status, RunStatus.PARTIAL)
        self.assertEqual(runs[1].invoices_created, 0)

    def test_all_enrolled_students_included(self):
        parent_a = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="a@example.com",
        )
        parent_b = Parent.objects.create(
            academy=self.academy,
            first_name="Jane",
            last_name="Doe",
            email="b@example.com",
        )
        parent_c = Parent.objects.create(
            academy=self.academy,
            first_name="Jim",
            last_name="Doe",
            email="c@example.com",
        )

        s1 = self._create_student(parent=parent_a, first_name="Alice")
        s2 = self._create_student(parent=parent_a, first_name="Bob")
        s3 = self._create_student(parent=parent_b, first_name="Carol")
        s4 = self._create_student(parent=parent_c, first_name="Eve")

        self._create_enrollment(student=s1)
        self._create_enrollment(student=s2)
        self._create_enrollment(student=s3)
        self._create_enrollment(student=s4, status=Enrollment.Status.COMPLETED)

        schedule = InvoiceSchedule.objects.create(
            academy=self.academy,
            class_obj=self.class_obj,
            billing_item=self.billing_item,
            billing_type=BillingType.MONTHLY,
            billing_day=self.today.day,
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )

        with self._patch_tasks_today():
            evaluate_monthly_schedules()

        items = InvoiceItem.objects.filter(invoice__schedule=schedule).select_related("student")
        student_ids = {item.student_id for item in items}
        self.assertEqual(student_ids, {s1.id, s2.id, s3.id})

        # Two parents => two invoices created.
        runs = InvoiceScheduleRun.objects.get(schedule=schedule)
        self.assertEqual(runs.invoices_created, 2)
        self.assertEqual(Invoice.objects.filter(schedule=schedule).count(), 2)

    def test_overrides_applied_in_monthly_mode(self):
        parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com",
        )
        student = self._create_student(parent=parent, first_name="Alice")
        self._create_enrollment(student=student)

        schedule = InvoiceSchedule.objects.create(
            academy=self.academy,
            class_obj=self.class_obj,
            billing_item=self.billing_item,
            billing_type=BillingType.MONTHLY,
            billing_day=self.today.day,
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )

        StudentScheduleOverride.objects.create(
            schedule=schedule,
            student=student,
            discount_type=DiscountType.PERCENTAGE,
            discount_value=Decimal("20.00"),
            reason="Scholarship",
            is_active=True,
            valid_from=self.today - timedelta(days=1),
            valid_until=self.today + timedelta(days=1),
        )

        with self._patch_tasks_today():
            evaluate_monthly_schedules()

        item = InvoiceItem.objects.get(invoice__schedule=schedule, student=student)
        self.assertEqual(item.unit_price, Decimal("80.00"))
        self.assertEqual(
            item.description,
            f"{self.billing_item.name} — {student.full_name} (Scholarship)",
        )

    def test_invoice_schedule_run_created_with_failed_status_on_service_error(self):
        parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com",
        )
        student = self._create_student(parent=parent, first_name="Alice")
        self._create_enrollment(student=student)

        schedule = InvoiceSchedule.objects.create(
            academy=self.academy,
            class_obj=self.class_obj,
            billing_item=self.billing_item,
            billing_type=BillingType.MONTHLY,
            billing_day=self.today.day,
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )

        def boom(*_args, **_kwargs):
            raise RuntimeError("Boom while generating invoices.")

        with self._patch_tasks_today(), patch(
            "tenant.billing.tasks.generate_invoices_for_schedule",
            side_effect=boom,
        ):
            evaluate_monthly_schedules()

        self.assertEqual(Invoice.objects.count(), 0)
        run = InvoiceScheduleRun.objects.get(schedule=schedule)
        self.assertEqual(run.status, RunStatus.FAILED)
        self.assertEqual(run.invoices_created, 0)
        self.assertEqual(run.triggered_by, TriggerSource.SCHEDULED)

    def test_run_invoice_schedules_calls_both_sub_tasks(self):
        with patch("tenant.billing.tasks.evaluate_session_schedules.delay") as session_delay, patch(
            "tenant.billing.tasks.evaluate_monthly_schedules.delay"
        ) as monthly_delay:
            run_invoice_schedules()
            session_delay.assert_called_once()
            monthly_delay.assert_called_once()

    def test_run_invoice_schedules_has_retry_policy_and_ignores_result(self):
        self.assertTrue(run_invoice_schedules.ignore_result)
        self.assertIn(Exception, run_invoice_schedules.autoretry_for)
        self.assertEqual(run_invoice_schedules.retry_kwargs.get("max_retries"), 3)

    def test_beat_entry_registered(self):
        call_command("seed_beat_schedule", verbosity=0)
        self.assertTrue(
            PeriodicTask.objects.filter(
                task="tenant.billing.tasks.run_invoice_schedules", enabled=True
            ).exists()
        )

