from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from saas_platform.tenants.models import Academy
from tenant.attendance.models import Attendance
from tenant.billing.models import (
    DiscountType,
    Invoice,
    InvoiceItem,
    InvoiceSchedule,
    InvoiceScheduleRun,
    Item,
    StudentInvoiceCycle,
    StudentScheduleOverride,
    BillingType,
    RunStatus,
)
from tenant.classes.models import Class, Enrollment
from tenant.onboarding.models import Location, Sport
from tenant.students.models import Parent, Student
from tenant.billing.tasks import evaluate_session_schedules


class SessionBasedInvoiceScheduleTaskTest(TestCase):
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
            name="Session Fee",
            description="Session-based fee",
            price=Decimal("100.00"),
            currency="USD",
        )

        self.today = timezone.now().date()
        self.cycle_start_date = self.today - timedelta(days=10)

    def _create_student(self, *, parent: Parent, first_name: str):
        return Student.objects.create(
            academy=self.academy,
            parent=parent,
            first_name=first_name,
            last_name="Student",
            is_active=True,
        )

    def _create_enrollment_and_attendance(
        self,
        *,
        student: Student,
        attendance_by_date,
        class_obj: Class | None = None,
    ):
        class_obj = class_obj or self.class_obj
        Enrollment.objects.create(
            academy=self.academy,
            student=student,
            class_obj=class_obj,
            status=Enrollment.Status.ENROLLED,
        )
        for dt, status in attendance_by_date:
            Attendance.objects.create(
                academy=self.academy,
                student=student,
                class_obj=class_obj,
                date=dt,
                status=status,
            )

    def _run_task(self):
        evaluate_session_schedules()

    def test_creates_draft_invoices_and_invoice_items_when_threshold_met(self):
        parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com",
        )
        student = self._create_student(parent=parent, first_name="Alice")

        schedule = InvoiceSchedule.objects.create(
            academy=self.academy,
            class_obj=self.class_obj,
            billing_item=self.billing_item,
            billing_type=BillingType.SESSION_BASED,
            sessions_per_cycle=2,
            bill_absent_sessions=False,
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )

        d1 = self.today - timedelta(days=5)
        d2 = self.today - timedelta(days=4)
        self._create_enrollment_and_attendance(
            student=student,
            attendance_by_date=[(d1, Attendance.Status.PRESENT), (d2, Attendance.Status.PRESENT)],
        )

        self._run_task()

        invoice = Invoice.objects.get(parent=parent)
        self.assertEqual(invoice.status, Invoice.Status.DRAFT)
        self.assertEqual(invoice.schedule, schedule)
        self.assertEqual(invoice.sport, self.class_obj.sport)
        self.assertEqual(invoice.location, self.class_obj.location)

        item = InvoiceItem.objects.get(invoice=invoice, student=student)
        self.assertEqual(item.quantity, 1)
        self.assertEqual(item.item, self.billing_item)
        self.assertEqual(item.unit_price, Decimal("100.00"))
        self.assertEqual(item.description, f"{self.billing_item.name} — {student.full_name}")

    def test_parent_grouping_one_invoice_per_parent_multiple_line_items(self):
        parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com",
        )
        student1 = self._create_student(parent=parent, first_name="Alice")
        student2 = self._create_student(parent=parent, first_name="Bob")

        schedule = InvoiceSchedule.objects.create(
            academy=self.academy,
            class_obj=self.class_obj,
            billing_item=self.billing_item,
            billing_type=BillingType.SESSION_BASED,
            sessions_per_cycle=2,
            bill_absent_sessions=False,
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )

        d1 = self.today - timedelta(days=5)
        d2 = self.today - timedelta(days=4)
        for student in (student1, student2):
            self._create_enrollment_and_attendance(
                student=student,
                attendance_by_date=[(d1, Attendance.Status.PRESENT), (d2, Attendance.Status.PRESENT)],
            )

        self._run_task()

        invoices = Invoice.objects.filter(parent=parent, schedule=schedule)
        self.assertEqual(invoices.count(), 1)
        invoice = invoices.first()

        items = InvoiceItem.objects.filter(invoice=invoice).order_by("student_id")
        self.assertEqual(items.count(), 2)
        self.assertEqual({items[0].student_id, items[1].student_id}, {student1.id, student2.id})

    def test_scholarship_discount_reduces_unit_price_and_adds_override_reason(self):
        parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com",
        )
        student = self._create_student(parent=parent, first_name="Alice")

        schedule = InvoiceSchedule.objects.create(
            academy=self.academy,
            class_obj=self.class_obj,
            billing_item=self.billing_item,
            billing_type=BillingType.SESSION_BASED,
            sessions_per_cycle=1,
            bill_absent_sessions=False,
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

        d1 = self.today - timedelta(days=5)
        self._create_enrollment_and_attendance(
            student=student,
            attendance_by_date=[(d1, Attendance.Status.PRESENT)],
        )

        self._run_task()

        invoice = Invoice.objects.get(parent=parent, schedule=schedule)
        item = InvoiceItem.objects.get(invoice=invoice, student=student)
        self.assertEqual(item.unit_price, Decimal("80.00"))
        self.assertEqual(item.description, f"{self.billing_item.name} — {student.full_name} (Scholarship)")

    def test_cycles_reset_closed_cycle_invoice_set_new_cycle_opened_with_carried_last_counted_date(self):
        parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com",
        )
        student = self._create_student(parent=parent, first_name="Alice")

        schedule = InvoiceSchedule.objects.create(
            academy=self.academy,
            class_obj=self.class_obj,
            billing_item=self.billing_item,
            billing_type=BillingType.SESSION_BASED,
            sessions_per_cycle=1,
            bill_absent_sessions=False,
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )

        d1 = self.today - timedelta(days=5)
        self._create_enrollment_and_attendance(
            student=student,
            attendance_by_date=[(d1, Attendance.Status.PRESENT)],
        )

        self._run_task()

        closed_cycle = StudentInvoiceCycle.objects.get(
            schedule=schedule,
            student=student,
            cycle_number=1,
        )
        self.assertIsNotNone(closed_cycle.invoice)

        open_cycle = StudentInvoiceCycle.objects.get(
            schedule=schedule,
            student=student,
            cycle_number=2,
        )
        self.assertIsNone(open_cycle.invoice)
        self.assertEqual(open_cycle.sessions_counted, 0)
        self.assertEqual(open_cycle.last_counted_date, closed_cycle.last_counted_date)
        self.assertEqual(open_cycle.last_counted_date, d1)

    def test_idempotency_re_run_does_not_create_duplicates(self):
        parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com",
        )
        student = self._create_student(parent=parent, first_name="Alice")

        schedule = InvoiceSchedule.objects.create(
            academy=self.academy,
            class_obj=self.class_obj,
            billing_item=self.billing_item,
            billing_type=BillingType.SESSION_BASED,
            sessions_per_cycle=1,
            bill_absent_sessions=False,
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )

        d1 = self.today - timedelta(days=5)
        self._create_enrollment_and_attendance(
            student=student,
            attendance_by_date=[(d1, Attendance.Status.PRESENT)],
        )

        self._run_task()
        invoice_count = Invoice.objects.count()
        open_cycle = StudentInvoiceCycle.objects.get(
            schedule=schedule,
            student=student,
            cycle_number=2,
        )
        self.assertIsNone(open_cycle.invoice)
        self.assertEqual(open_cycle.sessions_counted, 0)
        self.assertEqual(open_cycle.last_counted_date, d1)

        self._run_task()

        self.assertEqual(Invoice.objects.count(), invoice_count)
        open_cycle.refresh_from_db()
        self.assertEqual(open_cycle.sessions_counted, 0)
        self.assertEqual(open_cycle.last_counted_date, d1)

        # Still exactly two cycles for the student: cycle 1 closed, cycle 2 open.
        self.assertEqual(
            StudentInvoiceCycle.objects.filter(schedule=schedule, student=student).count(),
            2,
        )

    def test_bill_absent_sessions_false_counts_only_present(self):
        parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com",
        )
        student = self._create_student(parent=parent, first_name="Alice")

        schedule = InvoiceSchedule.objects.create(
            academy=self.academy,
            class_obj=self.class_obj,
            billing_item=self.billing_item,
            billing_type=BillingType.SESSION_BASED,
            sessions_per_cycle=2,
            bill_absent_sessions=False,
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )

        present_date = self.today - timedelta(days=5)
        absent_date = self.today - timedelta(days=4)
        self._create_enrollment_and_attendance(
            student=student,
            attendance_by_date=[
                (present_date, Attendance.Status.PRESENT),
                (absent_date, Attendance.Status.ABSENT),
            ],
        )

        self._run_task()

        self.assertEqual(Invoice.objects.count(), 0)

        open_cycle = StudentInvoiceCycle.objects.get(
            schedule=schedule,
            student=student,
            invoice__isnull=True,
        )
        self.assertEqual(open_cycle.sessions_counted, 1)
        self.assertEqual(open_cycle.last_counted_date, present_date)

    def test_bill_absent_sessions_true_counts_present_and_absent(self):
        parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com",
        )
        student = self._create_student(parent=parent, first_name="Alice")

        schedule = InvoiceSchedule.objects.create(
            academy=self.academy,
            class_obj=self.class_obj,
            billing_item=self.billing_item,
            billing_type=BillingType.SESSION_BASED,
            sessions_per_cycle=2,
            bill_absent_sessions=True,
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )

        present_date = self.today - timedelta(days=5)
        absent_date = self.today - timedelta(days=4)
        self._create_enrollment_and_attendance(
            student=student,
            attendance_by_date=[
                (present_date, Attendance.Status.PRESENT),
                (absent_date, Attendance.Status.ABSENT),
            ],
        )

        self._run_task()

        self.assertEqual(Invoice.objects.count(), 1)
        invoice = Invoice.objects.get(schedule=schedule, parent=parent)
        item = InvoiceItem.objects.get(invoice=invoice, student=student)
        self.assertEqual(item.unit_price, Decimal("100.00"))

    def test_crash_isolation_schedule_a_fails_schedule_b_succeeds(self):
        parent_a = Parent.objects.create(
            academy=self.academy,
            first_name="ParentA",
            last_name="Last",
            email="a@example.com",
        )
        parent_b = Parent.objects.create(
            academy=self.academy,
            first_name="ParentB",
            last_name="Last",
            email="b@example.com",
        )

        student_a = self._create_student(parent=parent_a, first_name="AliceA")
        student_b = self._create_student(parent=parent_b, first_name="AliceB")

        # Enroll each student in the class tied to its schedule.
        self._create_enrollment_and_attendance(
            student=student_a,
            attendance_by_date=[(self.today - timedelta(days=5), Attendance.Status.PRESENT)],
        )

        class_obj_b = Class.objects.create(
            academy=self.academy,
            name="U10 Football (Class B)",
            description="Second class",
            sport=self.sport,
            location=self.location,
            max_capacity=20,
        )
        self._create_enrollment_and_attendance(
            student=student_b,
            attendance_by_date=[
                (self.today - timedelta(days=5), Attendance.Status.PRESENT),
                (self.today - timedelta(days=4), Attendance.Status.PRESENT),
            ],
            class_obj=class_obj_b,
        )

        schedule_a = InvoiceSchedule.objects.create(
            academy=self.academy,
            class_obj=self.class_obj,
            billing_item=self.billing_item,
            billing_type=BillingType.SESSION_BASED,
            sessions_per_cycle=1,
            bill_absent_sessions=False,
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )
        schedule_b = InvoiceSchedule.objects.create(
            academy=self.academy,
            class_obj=class_obj_b,
            billing_item=self.billing_item,
            billing_type=BillingType.SESSION_BASED,
            sessions_per_cycle=2,
            bill_absent_sessions=False,
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )

        real_service = None

        def side_effect(schedule, qualifying_students):
            nonlocal real_service
            if real_service is None:
                from tenant.billing.invoice_schedule_service import generate_invoices_for_schedule as real_service_func

                real_service = real_service_func

            if schedule.id == schedule_a.id:
                raise RuntimeError("Boom while generating invoices for schedule A.")
            return real_service(schedule, qualifying_students)

        with patch("tenant.billing.tasks.generate_invoices_for_schedule", side_effect=side_effect):
            self._run_task()

        # Schedule A should have failed and created no invoices.
        self.assertEqual(Invoice.objects.filter(schedule=schedule_a).count(), 0)
        run_a = InvoiceScheduleRun.objects.get(schedule=schedule_a)
        self.assertEqual(run_a.status, RunStatus.FAILED)

        # Schedule B should have succeeded and created one invoice for student_b's parent.
        invoices_b = Invoice.objects.filter(schedule=schedule_b)
        self.assertEqual(invoices_b.count(), 1)
        invoice_b = invoices_b.first()
        self.assertEqual(invoice_b.parent_id, parent_b.id)
        self.assertTrue(InvoiceItem.objects.filter(invoice=invoice_b, student=student_b).exists())

        run_b = InvoiceScheduleRun.objects.get(schedule=schedule_b)
        self.assertEqual(run_b.status, RunStatus.SUCCEEDED)

