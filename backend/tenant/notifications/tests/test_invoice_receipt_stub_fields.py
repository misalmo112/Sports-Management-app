from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from saas_platform.tenants.models import Academy
from tenant.billing.models import Invoice, Receipt
from tenant.students.models import Parent


class InvoiceReceiptStubFieldsTest(TestCase):
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
            onboarding_completed=True,
        )
        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com",
        )

    def test_invoice_stub_fields_save_and_retrieve(self):
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-INVSTUB-001",
        )

        expires_at = timezone.now() + timezone.timedelta(days=7)
        invoice.pdf_s3_key = "invoices/inv-001.pdf"
        invoice.payment_link = "https://example.com/pay/inv-001"
        invoice.payment_link_expires_at = expires_at

        invoice.save()

        fetched = Invoice.objects.get(pk=invoice.pk)
        self.assertEqual(fetched.pdf_s3_key, "invoices/inv-001.pdf")
        self.assertEqual(fetched.payment_link, "https://example.com/pay/inv-001")
        self.assertIsNotNone(fetched.payment_link_expires_at)

    def test_receipt_stub_fields_save_and_retrieve(self):
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-INVSTUB-002",
            total=Decimal("100.00"),
        )

        receipt = Receipt.objects.create(
            academy=self.academy,
            invoice=invoice,
            receipt_number="RCP-RECEIPTSTUB-001",
            amount=Decimal("50.00"),
            payment_method=Receipt.PaymentMethod.CARD,
        )

        receipt.pdf_s3_key = "receipts/rcp-001.pdf"
        receipt.save()

        fetched = Receipt.objects.get(pk=receipt.pk)
        self.assertEqual(fetched.pdf_s3_key, "receipts/rcp-001.pdf")

