from __future__ import annotations

import os
from decimal import Decimal
from unittest.mock import Mock, patch

from cryptography.fernet import Fernet
from django.test import TestCase
from django.utils import timezone

from saas_platform.tenants.models import Academy, AcademyWhatsAppConfig
from tenant.billing.models import Invoice, Receipt
from tenant.notifications.models import NotificationLog
from tenant.notifications.tasks import send_whatsapp_notification
from tenant.notifications.whatsapp_service import (
    WhatsAppDispatchRetryableError,
    WhatsAppNotificationService,
)

from shared.utils import encryption
from shared.utils.phone import normalize_to_e164


class PhoneNormalizationTests(TestCase):
    def test_normalize_to_e164_handles_gcc_formats(self):
        self.assertEqual(normalize_to_e164("+971501234567", "ARE"), "+971501234567")
        self.assertEqual(normalize_to_e164("00971501234567", "ARE"), "+971501234567")
        self.assertEqual(normalize_to_e164("0501234567", "ARE"), "+971501234567")
        self.assertEqual(normalize_to_e164("501234567", "ARE"), "+971501234567")
        self.assertEqual(normalize_to_e164("05 0123-4567", "ARE"), "+971501234567")

    def test_normalize_to_e164_returns_none_when_cannot_normalize(self):
        self.assertIsNone(normalize_to_e164("abc", "ARE"))
        self.assertIsNone(normalize_to_e164("", "ARE"))
        self.assertIsNone(normalize_to_e164("0501234567", "XXX"))


class WhatsAppNotificationServiceTest(TestCase):
    def setUp(self):
        # Configure Fernet key for encrypt/decrypt helpers.
        self.fernet_key = Fernet.generate_key().decode("utf-8")
        os.environ["FERNET_SECRET_KEY"] = self.fernet_key
        encryption._FERNET_INSTANCE = None

        self.access_token_plain = "test-access-token"
        self.phone_number_id = "1234567890"

        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
            onboarding_completed=True,
            country="ARE",
            currency="USD",
        )

        self.parent = Mock()
        # Use real Parent model fields via database-backed Parent object.
        # Import inside test to keep this file stable if model imports move.
        from tenant.students.models import Parent  # noqa: WPS433

        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john.doe@example.com",
            phone="0501234567",
        )

        self.invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            status=Invoice.Status.SENT,
            subtotal=Decimal("100.00"),
            discount_type=None,
            discount_value=None,
            discount_amount=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            total=Decimal("100.00"),
            due_date=timezone.now().date(),
            notes="",
            pdf_s3_key="",
            payment_link="",
            payment_link_expires_at=None,
        )

        self.receipt = Receipt.objects.create(
            academy=self.academy,
            invoice=self.invoice,
            receipt_number="RCP-001",
            amount=Decimal("20.00"),
            payment_method=Receipt.PaymentMethod.CARD,
            payment_date=timezone.now().date(),
            notes="",
            pdf_s3_key="",
        )

    def _create_config(self, *, is_enabled: bool = True, send_on_invoice_created: bool = True):
        encrypted = encryption.encrypt_value(self.access_token_plain)
        return AcademyWhatsAppConfig.objects.create(
            academy=self.academy,
            is_enabled=is_enabled,
            send_on_invoice_created=send_on_invoice_created,
            send_on_receipt_created=True,
            phone_number_id=self.phone_number_id,
            access_token_encrypted=encrypted,
            invoice_template_name="academy_invoice_created",
            receipt_template_name="academy_receipt_issued",
            template_language="en",
        )

    def _get_log(self, *, doc_type: str, object_id: int) -> NotificationLog:
        return NotificationLog.objects.get(
            academy=self.academy,
            channel=NotificationLog.Channel.WHATSAPP,
            doc_type=doc_type,
            object_id=object_id,
        )

    def test_config_missing_logs_skipped_no_http(self):
        with (
            patch("tenant.notifications.whatsapp_service.PDFService") as mock_pdf_cls,
            patch("tenant.notifications.whatsapp_service.requests.post") as mock_post,
        ):
            WhatsAppNotificationService.send_invoice_whatsapp(self.invoice.id)

        mock_pdf_cls.assert_not_called()
        mock_post.assert_not_called()

        log = self._get_log(doc_type=NotificationLog.DocType.INVOICE, object_id=self.invoice.id)
        self.assertEqual(log.status, NotificationLog.Status.SKIPPED)
        self.assertEqual(log.wa_message_id, "")

    def test_is_enabled_false_logs_skipped_no_http(self):
        self._create_config(is_enabled=False)

        with (
            patch("tenant.notifications.whatsapp_service.PDFService") as mock_pdf_cls,
            patch("tenant.notifications.whatsapp_service.requests.post") as mock_post,
        ):
            WhatsAppNotificationService.send_invoice_whatsapp(self.invoice.id)

        mock_pdf_cls.assert_not_called()
        mock_post.assert_not_called()

        log = self._get_log(doc_type=NotificationLog.DocType.INVOICE, object_id=self.invoice.id)
        self.assertEqual(log.status, NotificationLog.Status.SKIPPED)

    def test_phone_normalization_failure_logs_failed_and_returns(self):
        self._create_config(is_enabled=True)
        self.parent.phone = "abc"
        self.parent.save(update_fields=["phone"])

        with (
            patch("tenant.notifications.whatsapp_service.PDFService") as mock_pdf_cls,
            patch("tenant.notifications.whatsapp_service.requests.post") as mock_post,
        ):
            WhatsAppNotificationService.send_invoice_whatsapp(self.invoice.id)

        mock_pdf_cls.assert_not_called()
        mock_post.assert_not_called()

        log = self._get_log(doc_type=NotificationLog.DocType.INVOICE, object_id=self.invoice.id)
        self.assertEqual(log.status, NotificationLog.Status.FAILED)
        self.assertEqual(log.error_detail, "Phone could not be normalized to E.164")

    @patch("tenant.notifications.whatsapp_service.requests.post")
    @patch("tenant.notifications.whatsapp_service.PDFService")
    def test_success_sends_template_message_and_logs_wa_message_id(
        self, mock_pdf_cls, mock_post
    ):
        config = self._create_config(is_enabled=True)

        pdf_service = mock_pdf_cls.return_value
        pdf_service.generate_invoice_pdf.return_value = "inv/key.pdf"
        pdf_service.get_presigned_url.return_value = "https://example.com/presigned-invoice.pdf"

        mock_resp = Mock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"messages": [{"id": "wamid.abc123"}]}
        mock_post.return_value = mock_resp

        WhatsAppNotificationService.send_invoice_whatsapp(self.invoice.id)

        # Presign TTL must be 15 minutes (900 seconds).
        pdf_service.get_presigned_url.assert_called_once_with("inv/key.pdf", expiry_seconds=900)

        called_url = mock_post.call_args.args[0]
        self.assertIn(f"https://graph.facebook.com/v17.0/{config.phone_number_id}/messages", called_url)

        headers = mock_post.call_args.kwargs["headers"]
        self.assertEqual(headers["Authorization"], f"Bearer {self.access_token_plain}")

        payload = mock_post.call_args.kwargs["json"]
        self.assertEqual(payload["to"], "+971501234567")
        self.assertEqual(payload["template"]["name"], config.invoice_template_name)

        log = self._get_log(doc_type=NotificationLog.DocType.INVOICE, object_id=self.invoice.id)
        self.assertEqual(log.status, NotificationLog.Status.SENT)
        self.assertEqual(log.wa_message_id, "wamid.abc123")
        self.assertEqual(log.error_detail, "")
        self.assertNotIn(self.access_token_plain, log.error_detail or "")

    @patch("tenant.notifications.whatsapp_service.requests.post")
    @patch("tenant.notifications.whatsapp_service.PDFService")
    def test_http_4xx_logs_failed_and_task_does_not_retry(self, mock_pdf_cls, mock_post):
        self._create_config(is_enabled=True)

        pdf_service = mock_pdf_cls.return_value
        pdf_service.generate_invoice_pdf.return_value = "inv/key.pdf"
        pdf_service.get_presigned_url.return_value = "https://example.com/presigned-invoice.pdf"

        mock_resp = Mock()
        mock_resp.status_code = 400
        mock_resp.text = "Bad Request"
        mock_post.return_value = mock_resp

        with patch.object(send_whatsapp_notification, "retry") as mock_retry:
            send_whatsapp_notification.run("INVOICE", self.invoice.id)
            mock_retry.assert_not_called()

        log = self._get_log(doc_type=NotificationLog.DocType.INVOICE, object_id=self.invoice.id)
        self.assertEqual(log.status, NotificationLog.Status.FAILED)

    @patch("tenant.notifications.whatsapp_service.requests.post")
    @patch("tenant.notifications.whatsapp_service.PDFService")
    def test_http_5xx_logs_failed_and_task_retries(self, mock_pdf_cls, mock_post):
        self._create_config(is_enabled=True)

        pdf_service = mock_pdf_cls.return_value
        pdf_service.generate_invoice_pdf.return_value = "inv/key.pdf"
        pdf_service.get_presigned_url.return_value = "https://example.com/presigned-invoice.pdf"

        mock_resp = Mock()
        mock_resp.status_code = 500
        mock_resp.text = f"Upstream error: {self.access_token_plain}"
        mock_post.return_value = mock_resp

        send_whatsapp_notification.request.retries = 0

        with patch.object(send_whatsapp_notification, "retry", return_value=RuntimeError("retry called")) as mock_retry:
            with self.assertRaises(RuntimeError):
                send_whatsapp_notification.run("INVOICE", self.invoice.id)

        # Exponential backoff base: 60s at retries=0
        self.assertEqual(mock_retry.call_args.kwargs["countdown"], 60)

        log = self._get_log(doc_type=NotificationLog.DocType.INVOICE, object_id=self.invoice.id)
        self.assertEqual(log.status, NotificationLog.Status.FAILED)
        self.assertNotIn(self.access_token_plain, log.error_detail or "")

    @patch("tenant.notifications.tasks.WhatsAppNotificationService.send_invoice_whatsapp")
    def test_whatsapp_task_retries_with_exponential_backoff(self, mock_send_invoice):
        mock_send_invoice.side_effect = WhatsAppDispatchRetryableError(500, "boom")
        self.assertEqual(send_whatsapp_notification.max_retries, 3)

        for retries, expected_countdown in [(0, 60), (1, 120), (2, 240)]:
            send_whatsapp_notification.request.retries = retries
            with patch.object(
                send_whatsapp_notification,
                "retry",
                return_value=RuntimeError("retry called"),
            ) as mock_retry:
                with self.assertRaises(RuntimeError):
                    send_whatsapp_notification.run("INVOICE", self.invoice.id)

                self.assertEqual(
                    mock_retry.call_args.kwargs["countdown"],
                    expected_countdown,
                )

