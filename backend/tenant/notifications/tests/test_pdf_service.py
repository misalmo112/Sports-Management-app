from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone

from saas_platform.tenants.models import Academy
from tenant.billing.models import Invoice, InvoiceItem, Receipt
from tenant.notifications.pdf_service import PDFService
from tenant.students.models import Parent, Student


class PDFServiceTest(TestCase):
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
            onboarding_completed=True,
            currency="USD",
        )
        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            phone="555-1234",
        )
        self.student = Student.objects.create(
            academy=self.academy,
            parent=self.parent,
            first_name="Jane",
            last_name="Doe",
            email="jane@example.com",
        )

        self.invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-0001",
            issued_date=timezone.now().date(),
            due_date=timezone.now().date(),
            notes="Test notes",
        )

        InvoiceItem.objects.create(
            invoice=self.invoice,
            student=self.student,
            description="Monthly Class Fee",
            quantity=2,
            unit_price=Decimal("25.00"),
        )

        self.receipt = Receipt.objects.create(
            academy=self.academy,
            invoice=self.invoice,
            receipt_number="RCP-0001",
            amount=Decimal("20.00"),
            payment_method=Receipt.PaymentMethod.CARD,
            payment_date=timezone.now().date(),
            notes="Receipt notes",
        )

    def test_generate_invoice_pdf_returns_s3_key_and_persists(self):
        service = PDFService()
        expected_key = f"{self.academy.slug}/documents/invoices/{self.invoice.invoice_number}.pdf"

        pdf_bytes = b"%PDF-1.7 fake pdf bytes"
        with (
            patch.object(PDFService, "_html_to_pdf", return_value=pdf_bytes) as mock_html_to_pdf,
            patch.object(PDFService, "_upload_to_s3", return_value=expected_key) as mock_upload,
        ):
            returned_key = service.generate_invoice_pdf(self.invoice.pk)

        self.assertEqual(returned_key, expected_key)
        mock_html_to_pdf.assert_called_once()
        mock_upload.assert_called_once()

        # Ensure PDF bytes look like a real PDF.
        uploaded_pdf_bytes, uploaded_s3_key = mock_upload.call_args[0][0], mock_upload.call_args[0][1]
        self.assertTrue(uploaded_pdf_bytes.startswith(b"%PDF"))
        self.assertEqual(uploaded_s3_key, expected_key)

        rendered_html = service._render_html(
            "notifications/invoice_pdf.html",
            service._invoice_context(self.invoice),
        )
        self.assertIn(self.academy.name, rendered_html)
        self.assertIn(self.parent.full_name, rendered_html)
        self.assertIn("Monthly Class Fee", rendered_html)
        # Validate totals block renders at least subtotal/discount/tax/total (currency is rendered too).
        self.assertIn("Subtotal", rendered_html)
        self.assertIn("Discount", rendered_html)
        self.assertIn("Tax", rendered_html)
        self.assertIn("Total", rendered_html)
        self.assertIn("USD 50.00", rendered_html)
        self.assertIn("USD 0.00", rendered_html)

        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.pdf_s3_key, expected_key)
        self.assertIsNotNone(self.invoice.pdf_generated_at)

    def test_generate_invoice_pdf_idempotency_skips_upload_when_exists(self):
        service = PDFService()
        existing_key = f"{self.academy.slug}/documents/invoices/{self.invoice.invoice_number}.pdf"

        self.invoice.pdf_s3_key = existing_key
        self.invoice.pdf_generated_at = timezone.now()
        self.invoice.save(update_fields=["pdf_s3_key", "pdf_generated_at"])

        with (
            patch.object(PDFService, "_s3_object_exists", return_value=True) as mock_exists,
            patch.object(PDFService, "_render_html") as mock_render,
            patch.object(PDFService, "_html_to_pdf") as mock_html_to_pdf,
            patch.object(PDFService, "_upload_to_s3") as mock_upload,
        ):
            returned_key = service.generate_invoice_pdf(self.invoice.pk)

        self.assertEqual(returned_key, existing_key)
        mock_exists.assert_called_once_with(existing_key)
        mock_render.assert_not_called()
        mock_html_to_pdf.assert_not_called()
        mock_upload.assert_not_called()

    def test_generate_receipt_pdf_returns_s3_key(self):
        service = PDFService()
        expected_key = f"{self.academy.slug}/documents/receipts/{self.receipt.receipt_number}.pdf"

        pdf_bytes = b"%PDF-1.7 fake receipt pdf bytes"
        with (
            patch.object(PDFService, "_html_to_pdf", return_value=pdf_bytes) as _mock_html_to_pdf,
            patch.object(PDFService, "_upload_to_s3", return_value=expected_key) as mock_upload,
        ):
            returned_key = service.generate_receipt_pdf(self.receipt.pk)

        self.assertEqual(returned_key, expected_key)
        mock_upload.assert_called_once()

        _, uploaded_s3_key = mock_upload.call_args[0][0], mock_upload.call_args[0][1]
        self.assertEqual(uploaded_s3_key, expected_key)

        rendered_html = service._render_html(
            "notifications/receipt_pdf.html",
            service._receipt_context(self.receipt),
        )
        self.assertIn(self.academy.name, rendered_html)
        self.assertIn(self.receipt.receipt_number, rendered_html)
        self.assertIn("Card", rendered_html)
        self.assertIn("USD 20.00", rendered_html)
        self.assertIn("USD 30.00", rendered_html)  # remaining balance after payment

        self.receipt.refresh_from_db()
        self.assertEqual(self.receipt.pdf_s3_key, expected_key)
        self.assertIsNotNone(self.receipt.pdf_generated_at)

    def test_upload_to_s3_uses_application_pdf_content_type(self):
        service = PDFService()
        s3_key = f"{self.academy.slug}/documents/invoices/{self.invoice.invoice_number}.pdf"

        pdf_bytes = b"%PDF-1.7 fake pdf bytes"

        with patch("tenant.notifications.pdf_service.default_storage.save") as mock_save:
            mock_save.return_value = s3_key
            returned_key = service._upload_to_s3(pdf_bytes, s3_key)

        self.assertEqual(returned_key, s3_key)
        self.assertEqual(mock_save.call_count, 1)

        saved_key, saved_file = mock_save.call_args[0][0], mock_save.call_args[0][1]
        self.assertEqual(saved_key, s3_key)
        self.assertEqual(saved_file.content_type, "application/pdf")

    @override_settings(
        AWS_STORAGE_BUCKET_NAME="test-bucket",
        AWS_S3_ENDPOINT_URL="http://minio:9000",
        AWS_S3_PUBLIC_ENDPOINT_URL="http://localhost:9000",
        AWS_ACCESS_KEY_ID="test-key",
        AWS_SECRET_ACCESS_KEY="test-secret",
        AWS_S3_REGION_NAME="us-east-1",
        AWS_S3_USE_SSL=True,
    )
    def test_get_presigned_url_returns_https(self):
        service = PDFService()
        s3_key = f"{self.academy.slug}/documents/invoices/{self.invoice.invoice_number}.pdf"

        with (
            patch("tenant.notifications.pdf_service.default_storage") as mock_storage,
            patch("tenant.notifications.pdf_service.boto3.client") as mock_boto_client,
        ):
            mock_storage.bucket_name = "test-bucket"
            mock_client = mock_boto_client.return_value
            mock_client.generate_presigned_url.return_value = (
                "http://localhost:9000/test-bucket/some/path.pdf"
            )

            url = service.get_presigned_url(s3_key)

        self.assertIsInstance(url, str)
        self.assertTrue(url.startswith("https://"))

        mock_client.generate_presigned_url.assert_called_once()
        _, kwargs = mock_client.generate_presigned_url.call_args
        self.assertEqual(kwargs["ExpiresIn"], 900)
        self.assertEqual(kwargs["Params"]["Bucket"], "test-bucket")
        self.assertEqual(kwargs["Params"]["Key"], s3_key)

