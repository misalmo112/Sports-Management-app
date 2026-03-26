from __future__ import annotations

from decimal import Decimal
from unittest.mock import Mock, patch

from django.test import TestCase
from django.utils import timezone

from saas_platform.tenants.models import Academy
from tenant.billing.models import Invoice, Receipt
from tenant.notifications.email_service import EmailNotificationService
from tenant.notifications.models import NotificationLog
from tenant.notifications.tasks import send_email_notification
from tenant.students.models import Parent


class EmailNotificationServiceTest(TestCase):
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
            email="john.doe@example.com",
            phone="",
        )

    def _create_invoice(self, *, total: Decimal = Decimal("100.00")) -> Invoice:
        return Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            status=Invoice.Status.SENT,
            subtotal=total,
            discount_type=None,
            discount_value=None,
            discount_amount=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            total=total,
            due_date=timezone.now().date(),
            pdf_s3_key="",
            payment_link="",
            payment_link_expires_at=None,
        )

    def _create_receipt(self, invoice: Invoice, *, amount: Decimal = Decimal("100.00")) -> Receipt:
        return Receipt.objects.create(
            academy=self.academy,
            invoice=invoice,
            receipt_number="RCP-001",
            amount=amount,
            payment_method=Receipt.PaymentMethod.CARD,
            pdf_s3_key="",
        )

    @patch("tenant.notifications.email_service.EmailMultiAlternatives")
    @patch("tenant.notifications.email_service.PDFService")
    def test_send_invoice_email_sends_email_and_logs_sent(self, mock_pdf_cls, mock_email_cls):
        invoice = self._create_invoice()

        mock_pdf_service = mock_pdf_cls.return_value
        mock_pdf_service.generate_invoice_pdf.return_value = "inv/key.pdf"
        mock_pdf_service.get_presigned_url.return_value = "https://example.com/presigned-invoice.pdf"

        mock_email = mock_email_cls.return_value
        mock_email.send.return_value = 1

        EmailNotificationService.send_invoice_email(invoice.id)

        # PDF presign must be 1 hour (3600s)
        mock_pdf_service.get_presigned_url.assert_called_with("inv/key.pdf", expiry_seconds=3600)

        expected_subject = f"Invoice {invoice.invoice_number} from {self.academy.name}"
        mock_email_cls.assert_called_once()
        _, kwargs = mock_email_cls.call_args
        self.assertEqual(kwargs["subject"], expected_subject)
        self.assertEqual(kwargs["to"], [self.parent.email])

        # HTML body contains PDF URL.
        attach_args = mock_email.attach_alternative.call_args
        html_body = attach_args.args[0]
        self.assertIn(self.parent.first_name, html_body)
        self.assertIn("Download PDF", html_body)
        self.assertIn("https://example.com/presigned-invoice.pdf", html_body)

        log = NotificationLog.objects.get(
            academy=self.academy,
            channel=NotificationLog.Channel.EMAIL,
            doc_type=NotificationLog.DocType.INVOICE,
            object_id=invoice.id,
        )
        self.assertEqual(log.status, NotificationLog.Status.SENT)
        self.assertEqual(log.error_detail, "")

    @patch("tenant.notifications.email_service.EmailMultiAlternatives")
    @patch("tenant.notifications.email_service.PDFService")
    def test_send_receipt_email_sends_email_and_logs_sent(self, mock_pdf_cls, mock_email_cls):
        invoice = self._create_invoice()
        receipt = self._create_receipt(invoice)

        mock_pdf_service = mock_pdf_cls.return_value
        mock_pdf_service.generate_receipt_pdf.return_value = "rcp/key.pdf"
        mock_pdf_service.get_presigned_url.return_value = "https://example.com/presigned-receipt.pdf"

        mock_email = mock_email_cls.return_value
        mock_email.send.return_value = 1

        EmailNotificationService.send_receipt_email(receipt.id)

        expected_subject = f"Payment Receipt {receipt.receipt_number} — {self.academy.name}"
        _, kwargs = mock_email_cls.call_args
        self.assertEqual(kwargs["subject"], expected_subject)
        self.assertEqual(kwargs["to"], [self.parent.email])

        # Ensure HTML template includes receipt PDF URL.
        html_body = mock_email.attach_alternative.call_args.args[0]
        self.assertIn("Download Receipt PDF", html_body)
        self.assertIn("https://example.com/presigned-receipt.pdf", html_body)

        log = NotificationLog.objects.get(
            academy=self.academy,
            channel=NotificationLog.Channel.EMAIL,
            doc_type=NotificationLog.DocType.RECEIPT,
            object_id=receipt.id,
        )
        self.assertEqual(log.status, NotificationLog.Status.SENT)
        self.assertEqual(log.error_detail, "")

    @patch("tenant.notifications.email_service.EmailMultiAlternatives")
    @patch("tenant.notifications.email_service.PDFService")
    def test_send_invoice_email_logs_failed_on_email_send_error(self, mock_pdf_cls, mock_email_cls):
        invoice = self._create_invoice()

        mock_pdf_service = mock_pdf_cls.return_value
        mock_pdf_service.generate_invoice_pdf.return_value = "inv/key.pdf"
        mock_pdf_service.get_presigned_url.return_value = "https://example.com/presigned-invoice.pdf"

        mock_email = mock_email_cls.return_value
        mock_email.send.side_effect = Exception("sendgrid failure")

        with self.assertRaises(Exception):
            EmailNotificationService.send_invoice_email(invoice.id)

        log = NotificationLog.objects.get(
            academy=self.academy,
            channel=NotificationLog.Channel.EMAIL,
            doc_type=NotificationLog.DocType.INVOICE,
            object_id=invoice.id,
        )
        self.assertEqual(log.status, NotificationLog.Status.FAILED)
        self.assertIn("sendgrid failure", log.error_detail)

    @patch("tenant.notifications.email_service.EmailMultiAlternatives")
    @patch("tenant.notifications.email_service.PDFService")
    def test_send_invoice_email_skips_when_parent_email_blank(self, mock_pdf_cls, mock_email_cls):
        blank_parent = Parent.objects.create(
            academy=self.academy,
            first_name="Jane",
            last_name="Blank",
            email="",
            phone="",
        )
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=blank_parent,
            invoice_number="INV-002",
            status=Invoice.Status.SENT,
            subtotal=Decimal("50.00"),
            discount_type=None,
            discount_value=None,
            discount_amount=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            total=Decimal("50.00"),
            due_date=timezone.now().date(),
            pdf_s3_key="",
            payment_link="",
            payment_link_expires_at=None,
        )

        EmailNotificationService.send_invoice_email(invoice.id)

        mock_pdf_cls.assert_not_called()
        mock_email_cls.assert_not_called()

        log = NotificationLog.objects.get(
            academy=self.academy,
            channel=NotificationLog.Channel.EMAIL,
            doc_type=NotificationLog.DocType.INVOICE,
            object_id=invoice.id,
        )
        self.assertEqual(log.status, NotificationLog.Status.SKIPPED)

    @patch("tenant.notifications.tasks.EmailNotificationService.send_invoice_email")
    def test_celery_task_retries_with_exponential_backoff(self, mock_send_invoice):
        mock_send_invoice.side_effect = Exception("boom")

        self.assertEqual(send_email_notification.max_retries, 3)

        for retries, expected_countdown in [(0, 60), (1, 120), (2, 240)]:
            send_email_notification.request.retries = retries
            with patch.object(
                send_email_notification,
                "retry",
                return_value=RuntimeError("retry called"),
            ) as mock_retry:
                with self.assertRaises(RuntimeError):
                    send_email_notification.run("INVOICE", 123)

                self.assertEqual(
                    mock_retry.call_args.kwargs["countdown"],
                    expected_countdown,
                )

