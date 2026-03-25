from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.tenants.models import Academy
from tenant.billing.models import Invoice, InvoiceItem, Receipt
from tenant.students.models import Parent

User = get_user_model()


class PortalInvoiceApiTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.academy = Academy.objects.create(
            name="Portal Billing Academy",
            slug="portal-billing-academy",
            email="portal.billing@academy.test",
            onboarding_completed=True,
        )
        self.other_academy = Academy.objects.create(
            name="Other Portal Billing Academy",
            slug="other-portal-billing-academy",
            email="other.portal.billing@academy.test",
            onboarding_completed=True,
        )
        self.parent_user = User.objects.create_user(
            email="parent.billing@academy.test",
            password="testpass123",
            role=User.Role.PARENT,
            academy=self.academy,
            is_active=True,
        )
        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name="Invoice",
            last_name="Parent",
            email="PARENT.BILLING@academy.test",
            is_active=True,
        )
        self.other_parent = Parent.objects.create(
            academy=self.academy,
            first_name="Other",
            last_name="Parent",
            email="other.parent.billing@academy.test",
            is_active=True,
        )
        self.external_parent = Parent.objects.create(
            academy=self.other_academy,
            first_name="External",
            last_name="Parent",
            email="external.parent.billing@academy.test",
            is_active=True,
        )

        self.pending_invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-PENDING-1",
            status=Invoice.Status.SENT,
            total=Decimal("100.00"),
            subtotal=Decimal("100.00"),
        )
        self.paid_invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-PAID-1",
            status=Invoice.Status.PAID,
            total=Decimal("80.00"),
            subtotal=Decimal("80.00"),
        )
        self.draft_invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-DRAFT-1",
            status=Invoice.Status.DRAFT,
            total=Decimal("30.00"),
            subtotal=Decimal("30.00"),
        )
        self.cancelled_invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-CANCELLED-1",
            status=Invoice.Status.CANCELLED,
            total=Decimal("30.00"),
            subtotal=Decimal("30.00"),
        )
        self.other_parent_invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.other_parent,
            invoice_number="INV-OTHER-1",
            status=Invoice.Status.SENT,
            total=Decimal("45.00"),
            subtotal=Decimal("45.00"),
        )
        Invoice.objects.create(
            academy=self.other_academy,
            parent=self.external_parent,
            invoice_number="INV-EXT-1",
            status=Invoice.Status.SENT,
            total=Decimal("77.00"),
            subtotal=Decimal("77.00"),
        )
        InvoiceItem.objects.create(
            invoice=self.pending_invoice,
            description="January Fee",
            quantity=1,
            unit_price=Decimal("100.00"),
            line_total=Decimal("100.00"),
        )
        Receipt.objects.create(
            academy=self.academy,
            invoice=self.pending_invoice,
            receipt_number="RCP-1",
            amount=Decimal("40.00"),
            payment_method=Receipt.PaymentMethod.CASH,
        )

    def _login_parent(self):
        token_response = self.client.post(
            "/api/v1/auth/token/",
            {"email": self.parent_user.email, "password": "testpass123"},
            format="json",
        )
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}",
            HTTP_X_ACADEMY_ID=str(self.academy.id),
        )

    def test_invoice_list_status_filters_and_default_scope(self):
        self._login_parent()
        base_url = "/api/v1/tenant/portal/invoices/"

        default_response = self.client.get(base_url)
        self.assertEqual(default_response.status_code, status.HTTP_200_OK)
        default_items = default_response.data.get("results", default_response.data)
        default_ids = {item["id"] for item in default_items}
        self.assertIn(self.pending_invoice.id, default_ids)
        self.assertIn(self.paid_invoice.id, default_ids)
        self.assertNotIn(self.draft_invoice.id, default_ids)
        self.assertNotIn(self.cancelled_invoice.id, default_ids)
        self.assertNotIn(self.other_parent_invoice.id, default_ids)

        pending_response = self.client.get(base_url, {"status": "pending"})
        pending_ids = {item["id"] for item in pending_response.data.get("results", pending_response.data)}
        self.assertEqual(pending_ids, {self.pending_invoice.id})

        paid_response = self.client.get(base_url, {"status": "paid"})
        paid_ids = {item["id"] for item in paid_response.data.get("results", paid_response.data)}
        self.assertEqual(paid_ids, {self.paid_invoice.id})

        all_response = self.client.get(base_url, {"status": "all"})
        all_ids = {item["id"] for item in all_response.data.get("results", all_response.data)}
        self.assertEqual(all_ids, {self.pending_invoice.id, self.paid_invoice.id})

    def test_invoice_detail_includes_items_and_balances(self):
        self._login_parent()
        url = f"/api/v1/tenant/portal/invoices/{self.pending_invoice.id}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.pending_invoice.id)
        self.assertEqual(response.data["currency"], "USD")
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(response.data["items"][0]["description"], "January Fee")
        self.assertEqual(str(response.data["paid_amount"]), "40.00")
        self.assertEqual(str(response.data["remaining_balance"]), "60.00")

    def test_invoice_currency_reflects_academy_setting(self):
        self.academy.currency = "AED"
        self.academy.save(update_fields=["currency"])
        self._login_parent()
        url = f"/api/v1/tenant/portal/invoices/{self.pending_invoice.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["currency"], "AED")

    def test_invoice_receipts_and_isolation(self):
        self._login_parent()
        receipts_url = f"/api/v1/tenant/portal/invoices/{self.pending_invoice.id}/receipts/"
        receipts_response = self.client.get(receipts_url)
        self.assertEqual(receipts_response.status_code, status.HTTP_200_OK)
        items = receipts_response.data.get("results", receipts_response.data)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["receipt_number"], "RCP-1")

        other_invoice_url = f"/api/v1/tenant/portal/invoices/{self.other_parent_invoice.id}/"
        other_invoice_response = self.client.get(other_invoice_url)
        self.assertEqual(other_invoice_response.status_code, status.HTTP_404_NOT_FOUND)
