from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from saas_platform.audit.models import ErrorLog

from tenant.attendance.models import Attendance
from tenant.billing.models import (
    BillingType,
    DiscountType,
    Invoice,
    InvoiceSchedule,
    InvoiceScheduleRun,
    Item,
    RunStatus,
    StudentScheduleOverride,
    TriggerSource,
)
from tenant.classes.models import Class, Enrollment
from tenant.onboarding.models import Location, Sport
from tenant.students.models import Parent, Student
from tenant.billing.models import InvoiceItem
from django.contrib.auth import get_user_model
from tenant.billing.serializers import PendingApprovalInvoiceSerializer


User = get_user_model()


def _create_plan_and_subscription(*, academy: Academy):
    plan = Plan.objects.create(
        name=f"Basic Plan {academy.id}",
        slug=f"basic-plan-{academy.id}",
        limits_json={"max_students": 100},
    )
    subscription = Subscription.objects.create(
        academy=academy,
        plan=plan,
        status=SubscriptionStatus.ACTIVE,
        is_current=True,
        start_at=timezone.now(),
    )
    return subscription


class InvoiceScheduleViewSetAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
            onboarding_completed=True,
        )
        _create_plan_and_subscription(academy=self.academy)

        self.admin = User.objects.create_user(
            email="admin@academy.com",
            password="testpass123",
            role="ADMIN",
            academy=self.academy,
            is_active=True,
            is_verified=True,
        )
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

        self.sport = Sport.objects.create(
            academy=self.academy,
            name="Football",
            description="Football training",
        )
        self.location = Location.objects.create(
            academy=self.academy,
            name="Main Field",
        )

        self.class_a = Class.objects.create(
            academy=self.academy,
            name="U10 Football A",
            description="A",
            sport=self.sport,
            location=self.location,
            max_capacity=20,
        )
        self.class_b = Class.objects.create(
            academy=self.academy,
            name="U10 Football B",
            description="B",
            sport=self.sport,
            location=self.location,
            max_capacity=20,
        )
        self.class_c = Class.objects.create(
            academy=self.academy,
            name="U10 Football C",
            description="C",
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

        self.parent_a = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="a@example.com",
        )
        self.parent_b = Parent.objects.create(
            academy=self.academy,
            first_name="Jane",
            last_name="Doe",
            email="b@example.com",
        )
        self.student_a = Student.objects.create(
            academy=self.academy,
            parent=self.parent_a,
            first_name="Alice",
            last_name="A",
            is_active=True,
        )
        self.student_b = Student.objects.create(
            academy=self.academy,
            parent=self.parent_b,
            first_name="Bob",
            last_name="B",
            is_active=True,
        )

        Enrollment.objects.create(
            academy=self.academy,
            student=self.student_a,
            class_obj=self.class_a,
            status=Enrollment.Status.ENROLLED,
        )
        Enrollment.objects.create(
            academy=self.academy,
            student=self.student_b,
            class_obj=self.class_b,
            status=Enrollment.Status.ENROLLED,
        )
        Enrollment.objects.create(
            academy=self.academy,
            student=self.student_a,
            class_obj=self.class_c,
            status=Enrollment.Status.ENROLLED,
        )

        # Make sure both schedules would qualify if evaluated.
        Attendance.objects.create(
            academy=self.academy,
            student=self.student_a,
            class_obj=self.class_a,
            date=self.today - timedelta(days=5),
            status=Attendance.Status.PRESENT,
        )
        Attendance.objects.create(
            academy=self.academy,
            student=self.student_b,
            class_obj=self.class_b,
            date=self.today - timedelta(days=5),
            status=Attendance.Status.PRESENT,
        )

        self.schedule_a = InvoiceSchedule.objects.create(
            academy=self.academy,
            class_obj=self.class_a,
            billing_item=self.billing_item,
            billing_type=BillingType.SESSION_BASED,
            sessions_per_cycle=1,
            bill_absent_sessions=False,
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )
        self.schedule_b = InvoiceSchedule.objects.create(
            academy=self.academy,
            class_obj=self.class_b,
            billing_item=self.billing_item,
            billing_type=BillingType.SESSION_BASED,
            sessions_per_cycle=1,
            bill_absent_sessions=False,
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )

    def test_invoice_schedule_post_validates_and_sets_academy(self):
        url = "/api/v1/tenant/invoice-schedules/"

        # Missing sessions_per_cycle for SESSION_BASED schedule => 400.
        payload = {
            "class_obj": self.class_c.id,
            "billing_item": self.billing_item.id,
            "billing_type": BillingType.SESSION_BASED,
            "bill_absent_sessions": False,
            "cycle_start_date": self.cycle_start_date.isoformat(),
            "is_active": True,
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid payload => 201 and academy auto-filled from request.academy.
        payload["sessions_per_cycle"] = 1
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["academy"], self.academy.id)

    def test_toggle_active_run_and_runs_scoped_to_pk(self):
        list_res = self.client.get("/api/v1/tenant/invoice-schedules/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        # Includes schedule_a and schedule_b
        self.assertGreaterEqual(list_res.data["count"], 2)

        self.assertEqual(InvoiceScheduleRun.objects.count(), 0)
        self.assertEqual(Invoice.objects.count(), 0)

        run_res = self.client.post(
            f"/api/v1/tenant/invoice-schedules/{self.schedule_a.id}/run/",
            {},
            format="json",
        )
        self.assertEqual(run_res.status_code, status.HTTP_200_OK)
        self.assertIn("invoices_created", run_res.data)
        self.assertEqual(run_res.data["status"], RunStatus.SUCCEEDED)
        self.assertEqual(run_res.data["invoices_created"], 1)

        # Schedule A ran (MANUAL), schedule B must not have been evaluated.
        self.assertTrue(
            InvoiceScheduleRun.objects.filter(
                schedule=self.schedule_a,
                triggered_by=TriggerSource.MANUAL,
            ).exists()
        )
        self.assertEqual(
            InvoiceScheduleRun.objects.filter(schedule=self.schedule_b).count(),
            0,
        )
        self.assertEqual(Invoice.objects.filter(schedule=self.schedule_a).count(), 1)
        self.assertEqual(Invoice.objects.filter(schedule=self.schedule_b).count(), 0)

        runs_res = self.client.get(f"/api/v1/tenant/invoice-schedules/{self.schedule_a.id}/runs/")
        self.assertEqual(runs_res.status_code, status.HTTP_200_OK)
        self.assertEqual(runs_res.data["count"], 1)
        self.assertEqual(runs_res.data["results"][0]["triggered_by"], TriggerSource.MANUAL)

        toggle_res = self.client.post(
            f"/api/v1/tenant/invoice-schedules/{self.schedule_a.id}/toggle-active/",
            {},
            format="json",
        )
        self.assertEqual(toggle_res.status_code, status.HTTP_200_OK)
        self.schedule_a.refresh_from_db()
        self.assertEqual(self.schedule_a.is_active, toggle_res.data["is_active"])

    def test_manual_run_monthly_is_triggered_by_manual(self):
        schedule_monthly = InvoiceSchedule.objects.create(
            academy=self.academy,
            class_obj=self.class_c,
            billing_item=self.billing_item,
            billing_type=BillingType.MONTHLY,
            billing_day=self.today.day,
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )

        run_res = self.client.post(
            f"/api/v1/tenant/invoice-schedules/{schedule_monthly.id}/run/",
            {},
            format="json",
        )
        self.assertEqual(run_res.status_code, status.HTTP_200_OK)
        self.assertEqual(run_res.data["status"], RunStatus.SUCCEEDED)
        self.assertEqual(run_res.data["invoices_created"], 1)

        run = InvoiceScheduleRun.objects.get(schedule=schedule_monthly)
        self.assertEqual(run.triggered_by, TriggerSource.MANUAL)
        self.assertEqual(run.status, RunStatus.SUCCEEDED)
        self.assertEqual(Invoice.objects.filter(schedule=schedule_monthly).count(), 1)


class StudentScheduleOverrideViewSetAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.academy = Academy.objects.create(
            name="Override Academy",
            slug="override-academy",
            email="override@example.com",
            onboarding_completed=True,
        )
        _create_plan_and_subscription(academy=self.academy)

        self.admin = User.objects.create_user(
            email="admin@override.com",
            password="testpass123",
            role="ADMIN",
            academy=self.academy,
            is_active=True,
            is_verified=True,
        )
        self.parent_user = User.objects.create_user(
            email="parent@override.com",
            password="testpass123",
            role="PARENT",
            academy=self.academy,
            is_active=True,
            is_verified=True,
        )

        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

        self.sport = Sport.objects.create(
            academy=self.academy,
            name="Tennis",
            description="Tennis training",
        )
        self.location = Location.objects.create(
            academy=self.academy,
            name="Court A",
        )
        self.class_obj = Class.objects.create(
            academy=self.academy,
            name="U12 Tennis",
            description="T",
            sport=self.sport,
            location=self.location,
            max_capacity=20,
        )
        self.billing_item = Item.objects.create(
            academy=self.academy,
            name="Session Fee",
            description="Session fee",
            price=Decimal("50.00"),
            currency="USD",
        )
        self.today = timezone.now().date()
        self.cycle_start_date = self.today - timedelta(days=10)

        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="parent@example.com",
        )
        self.student = Student.objects.create(
            academy=self.academy,
            parent=self.parent,
            first_name="Alice",
            last_name="Student",
            is_active=True,
        )

        self.schedule = InvoiceSchedule.objects.create(
            academy=self.academy,
            class_obj=self.class_obj,
            billing_item=self.billing_item,
            billing_type=BillingType.SESSION_BASED,
            sessions_per_cycle=1,
            bill_absent_sessions=False,
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )

        self.other_academy = Academy.objects.create(
            name="Other Academy",
            slug="other-academy",
            email="other@example.com",
            onboarding_completed=True,
        )
        _create_plan_and_subscription(academy=self.other_academy)
        self.other_sport = Sport.objects.create(
            academy=self.other_academy,
            name="Tennis",
            description="Tennis",
        )
        self.other_location = Location.objects.create(
            academy=self.other_academy,
            name="Court B",
        )
        self.other_class = Class.objects.create(
            academy=self.other_academy,
            name="U12 Tennis Other",
            description="T",
            sport=self.other_sport,
            location=self.other_location,
            max_capacity=20,
        )
        self.other_billing_item = Item.objects.create(
            academy=self.other_academy,
            name="Session Fee",
            description="Session fee",
            price=Decimal("50.00"),
            currency="USD",
        )
        self.other_schedule = InvoiceSchedule.objects.create(
            academy=self.other_academy,
            class_obj=self.other_class,
            billing_item=self.other_billing_item,
            billing_type=BillingType.SESSION_BASED,
            sessions_per_cycle=1,
            bill_absent_sessions=False,
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )

    def test_override_create_requires_tenant_admin_and_validates_percentage(self):
        url = f"/api/v1/tenant/invoice-schedules/{self.schedule.id}/overrides/"

        self.client.force_authenticate(user=self.parent_user)
        res = self.client.post(
            url,
            {
                "student": self.student.id,
                "discount_type": DiscountType.PERCENTAGE,
                "discount_value": "10.00",
                "reason": "Scholarship",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.admin)
        res = self.client.post(
            url,
            {
                "student": self.student.id,
                "discount_type": DiscountType.PERCENTAGE,
                "discount_value": "101.00",
                "reason": "Scholarship",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        res = self.client.post(
            url,
            {
                "student": self.student.id,
                "discount_type": DiscountType.PERCENTAGE,
                "discount_value": "50.00",
                "reason": "Scholarship",
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(StudentScheduleOverride.objects.filter(schedule=self.schedule, student=self.student).count(), 1)

        list_res = self.client.get(url)
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(list_res.data["count"], 1)
        self.assertEqual(list_res.data["results"][0]["discount_value"], "50.00")

    def test_override_create_cannot_target_other_academy_schedule(self):
        url = f"/api/v1/tenant/invoice-schedules/{self.other_schedule.id}/overrides/"
        res = self.client.post(
            url,
            {
                "student": self.student.id,
                "discount_type": DiscountType.PERCENTAGE,
                "discount_value": "10.00",
                "reason": "Scholarship",
            },
            format="json",
        )
        self.assertIn(res.status_code, (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN))


class PendingApprovalsViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.academy = Academy.objects.create(
            name="Pending Academy",
            slug="pending-academy",
            email="pending@example.com",
            onboarding_completed=True,
        )
        _create_plan_and_subscription(academy=self.academy)

        self.admin = User.objects.create_user(
            email="admin@pending.com",
            password="testpass123",
            role="ADMIN",
            academy=self.academy,
            is_active=True,
            is_verified=True,
        )
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

        self.sport = Sport.objects.create(
            academy=self.academy,
            name="Basketball",
            description="Basketball",
        )
        self.location = Location.objects.create(
            academy=self.academy,
            name="Gym",
        )
        self.class_obj = Class.objects.create(
            academy=self.academy,
            name="U10 Basketball",
            description="B",
            sport=self.sport,
            location=self.location,
            max_capacity=20,
        )
        self.billing_item = Item.objects.create(
            academy=self.academy,
            name="Monthly Fee",
            description="Monthly",
            price=Decimal("100.00"),
            currency="USD",
        )
        self.today = timezone.now().date()
        self.cycle_start_date = self.today - timedelta(days=10)

        self.schedule = InvoiceSchedule.objects.create(
            academy=self.academy,
            class_obj=self.class_obj,
            billing_item=self.billing_item,
            billing_type=BillingType.MONTHLY,
            billing_day=min(28, self.today.day),
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )

        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="parent@example.com",
        )
        self.student = Student.objects.create(
            academy=self.academy,
            parent=self.parent,
            first_name="Alice",
            last_name="Student",
            is_active=True,
        )

        self.student_2 = Student.objects.create(
            academy=self.academy,
            parent=self.parent,
            first_name="Bob",
            last_name="Student",
            is_active=True,
        )

        self.invoice_pending = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-PENDING",
            status=Invoice.Status.DRAFT,
            total=Decimal("100.00"),
            schedule=self.schedule,
        )
        InvoiceItem.objects.create(
            invoice=self.invoice_pending,
            item=self.billing_item,
            student=self.student,
            description=f"{self.billing_item.name} — {self.student.full_name}",
            quantity=1,
            unit_price=Decimal("100.00"),
        )
        InvoiceItem.objects.create(
            invoice=self.invoice_pending,
            item=self.billing_item,
            student=self.student_2,
            description=f"{self.billing_item.name} — {self.student_2.full_name}",
            quantity=1,
            unit_price=Decimal("100.00"),
        )
        self.invoice_pending.refresh_from_db()

        self.invoice_not_scheduled = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-NOSCHEDULE",
            status=Invoice.Status.DRAFT,
            total=Decimal("100.00"),
            schedule=None,
        )
        self.invoice_sent = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-SENT",
            status=Invoice.Status.SENT,
            total=Decimal("100.00"),
            schedule=self.schedule,
        )

    def test_pending_approvals_returns_only_schedule_generated_drafts(self):
        res = self.client.get("/api/v1/tenant/pending-approvals/")
        if res.status_code != status.HTTP_200_OK:
            err = ErrorLog.objects.filter(path="/api/v1/tenant/pending-approvals/").order_by("-created_at").first()
            self.fail(
                f"Pending approvals failed: status={res.status_code}, body={res.content}. "
                f"ErrorLog.stacktrace={getattr(err, 'stacktrace', None)}"
            )
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.content)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["id"], self.invoice_pending.id)

        # Filter by date_from in the future => no results.
        tomorrow = (self.today + timedelta(days=1)).isoformat()
        res2 = self.client.get("/api/v1/tenant/pending-approvals/", {"date_from": tomorrow})
        if res2.status_code != status.HTTP_200_OK:
            err = ErrorLog.objects.filter(path="/api/v1/tenant/pending-approvals/").order_by("-created_at").first()
            self.fail(
                f"Pending approvals date filter failed: status={res2.status_code}, body={res2.content}. "
                f"ErrorLog.stacktrace={getattr(err, 'stacktrace', None)}"
            )
        self.assertEqual(res2.status_code, status.HTTP_200_OK, res2.content)
        self.assertEqual(res2.data["count"], 0)

    def test_pending_approvals_filter_by_schedule_id(self):
        res = self.client.get(
            "/api/v1/tenant/pending-approvals/",
            {"schedule_id": str(self.schedule.id)},
        )
        if res.status_code != status.HTTP_200_OK:
            err = ErrorLog.objects.filter(path="/api/v1/tenant/pending-approvals/").order_by("-created_at").first()
            self.fail(
                f"Pending approvals schedule filter failed: status={res.status_code}, body={res.content}. "
                f"ErrorLog.stacktrace={getattr(err, 'stacktrace', None)}"
            )
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.content)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["schedule_id"], self.schedule.id)

    def test_pending_approval_serializer_direct(self):
        # If this fails, it explains the 500s coming from the endpoint.
        serializer = PendingApprovalInvoiceSerializer(self.invoice_pending)
        data = serializer.data
        self.assertEqual(data["id"], self.invoice_pending.id)
        self.assertEqual(data["total"], str(self.invoice_pending.total))
        self.assertEqual(data["currency"], "USD")

        expected_students = ", ".join(
            student.full_name
            for student in sorted([self.student, self.student_2], key=lambda s: s.id)
        )
        self.assertEqual(data["students"], expected_students)


class BulkIssueViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.academy = Academy.objects.create(
            name="Bulk Issue Academy",
            slug="bulk-issue-academy",
            email="bulk@example.com",
            onboarding_completed=True,
        )
        _create_plan_and_subscription(academy=self.academy)

        self.admin = User.objects.create_user(
            email="admin@bulk.com",
            password="testpass123",
            role="ADMIN",
            academy=self.academy,
            is_active=True,
            is_verified=True,
        )
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

        self.sport = Sport.objects.create(
            academy=self.academy,
            name="Swimming",
            description="S",
        )
        self.location = Location.objects.create(
            academy=self.academy,
            name="Pool",
        )
        self.class_obj = Class.objects.create(
            academy=self.academy,
            name="U8 Swimming",
            description="S",
            sport=self.sport,
            location=self.location,
            max_capacity=20,
        )
        self.billing_item = Item.objects.create(
            academy=self.academy,
            name="Monthly Fee",
            description="Monthly",
            price=Decimal("100.00"),
            currency="USD",
        )
        self.today = timezone.now().date()
        self.cycle_start_date = self.today - timedelta(days=10)

        self.schedule = InvoiceSchedule.objects.create(
            academy=self.academy,
            class_obj=self.class_obj,
            billing_item=self.billing_item,
            billing_type=BillingType.MONTHLY,
            billing_day=min(28, self.today.day),
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )

        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="parent@example.com",
        )

        self.invoice1 = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV1",
            status=Invoice.Status.DRAFT,
            total=Decimal("100.00"),
            schedule=self.schedule,
        )
        self.invoice2 = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV2",
            status=Invoice.Status.DRAFT,
            total=Decimal("100.00"),
            schedule=self.schedule,
        )

        self.other_academy = Academy.objects.create(
            name="Other Bulk Academy",
            slug="other-bulk-academy",
            email="otherbulk@example.com",
            onboarding_completed=True,
        )
        _create_plan_and_subscription(academy=self.other_academy)
        self.other_parent = Parent.objects.create(
            academy=self.other_academy,
            first_name="Jane",
            last_name="Doe",
            email="otherparent@example.com",
        )
        self.other_schedule = InvoiceSchedule.objects.create(
            academy=self.other_academy,
            class_obj=self.class_obj,  # same class structure is fine for this simplified test
            billing_item=self.billing_item,
            billing_type=BillingType.MONTHLY,
            billing_day=min(28, self.today.day),
            cycle_start_date=self.cycle_start_date,
            is_active=True,
        )
        self.other_invoice = Invoice.objects.create(
            academy=self.other_academy,
            parent=self.other_parent,
            invoice_number="INV-OTHER",
            status=Invoice.Status.DRAFT,
            total=Decimal("100.00"),
            schedule=self.other_schedule,
        )

    def test_bulk_issue_invalid_ids_and_academy_isolation(self):
        # Other-academy invoice id => 403.
        res = self.client.post(
            "/api/v1/tenant/bulk-issue/",
            {"invoice_ids": [self.invoice1.id, self.other_invoice.id]},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Non-existent id => 400.
        res2 = self.client.post(
            "/api/v1/tenant/bulk-issue/",
            {"invoice_ids": [999999]},
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bulk_issue_sets_status_and_issued_date(self):
        res = self.client.post(
            "/api/v1/tenant/bulk-issue/",
            {"invoice_ids": [self.invoice1.id, self.invoice2.id]},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["invoices_issued"], 2)

        self.invoice1.refresh_from_db()
        self.invoice2.refresh_from_db()
        self.assertEqual(self.invoice1.status, Invoice.Status.SENT)
        self.assertEqual(self.invoice2.status, Invoice.Status.SENT)
        self.assertEqual(self.invoice1.issued_date, self.today)
        self.assertEqual(self.invoice2.issued_date, self.today)

