from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from tenant.billing.models import Invoice, Receipt
from tenant.students.models import Parent
from django.contrib.auth import get_user_model


User = get_user_model()


class PdfPreviewEndpointsTest(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
            onboarding_completed=True,
        )

        self.plan = Plan.objects.create(
            name="Basic Plan",
            slug="basic-plan",
            limits_json={"max_students": 100},
        )
        self.subscription = Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now(),
        )

        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="parent@example.com",
        )

        self.admin = User.objects.create_user(
            email="admin@academy.com",
            password="testpass123",
            role="ADMIN",
            academy=self.academy,
        )

        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

    @patch("tenant.notifications.pdf_service.PDFService.get_presigned_url")
    @patch("tenant.notifications.pdf_service.PDFService.generate_invoice_pdf")
    def test_invoice_pdf_preview_returns_url(self, mock_generate, mock_presigned):
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal("100.00"),
            status=Invoice.Status.SENT,
        )

        mock_generate.return_value = f"{self.academy.slug}/documents/invoices/{invoice.invoice_number}.pdf"
        mock_presigned.return_value = "http://example.com/invoice.pdf"

        resp = self.client.get(f"/api/v1/tenant/invoices/{invoice.id}/pdf/preview/")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["preview_url"], "http://example.com/invoice.pdf")
        mock_generate.assert_called_once_with(invoice.id)

    @patch("tenant.notifications.pdf_service.PDFService.get_presigned_url")
    @patch("tenant.notifications.pdf_service.PDFService.generate_receipt_pdf")
    def test_receipt_pdf_preview_returns_url(self, mock_generate, mock_presigned):
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal("100.00"),
            status=Invoice.Status.SENT,
        )

        receipt = Receipt.objects.create(
            academy=self.academy,
            invoice=invoice,
            receipt_number="RCP-001",
            amount=Decimal("50.00"),
            payment_method=Receipt.PaymentMethod.CASH,
            payment_date=timezone.now().date(),
            notes="",
        )

        mock_generate.return_value = f"{self.academy.slug}/documents/receipts/{receipt.receipt_number}.pdf"
        mock_presigned.return_value = "http://example.com/receipt.pdf"

        resp = self.client.get(f"/api/v1/tenant/receipts/{receipt.id}/pdf/preview/")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["preview_url"], "http://example.com/receipt.pdf")
        mock_generate.assert_called_once_with(receipt.id)

    def test_invoice_pdf_preview_other_academy_returns_404(self):
        academy2 = Academy.objects.create(
            name="Academy 2",
            slug="academy-2",
            email="academy2@test.com",
            onboarding_completed=True,
        )
        parent2 = Parent.objects.create(
            academy=academy2,
            first_name="Jane",
            last_name="Smith",
            email="jane@example.com",
        )
        invoice2 = Invoice.objects.create(
            academy=academy2,
            parent=parent2,
            invoice_number="INV-002",
            total=Decimal("200.00"),
            status=Invoice.Status.SENT,
        )

        resp = self.client.get(f"/api/v1/tenant/invoices/{invoice2.id}/pdf/preview/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

