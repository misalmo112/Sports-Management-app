from __future__ import annotations

from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.tenants.models import Academy
from tenant.billing.models import Invoice, Receipt
from tenant.notifications.models import NotificationLog
from tenant.students.models import Parent

User = get_user_model()


class PhaseWA5SignalsAndEndpointsTest(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.academy1 = Academy.objects.create(
            name="Academy 1",
            slug="academy-1",
            email="a1@academy.test",
            onboarding_completed=True,
        )
        self.academy2 = Academy.objects.create(
            name="Academy 2",
            slug="academy-2",
            email="a2@academy.test",
            onboarding_completed=True,
        )

        self.parent1 = Parent.objects.create(
            academy=self.academy1,
            first_name="John",
            last_name="Doe",
            email="john.doe@a1.test",
            phone="",
        )
        self.parent2 = Parent.objects.create(
            academy=self.academy2,
            first_name="Jane",
            last_name="Doe",
            email="jane.doe@a2.test",
            phone="",
        )

        self.admin1 = User.objects.create_user(
            email="admin1@a1.test",
            password="testpass123",
            role="ADMIN",
            academy=self.academy1,
        )
        self.admin2 = User.objects.create_user(
            email="admin2@a2.test",
            password="testpass123",
            role="ADMIN",
            academy=self.academy2,
        )

    def _create_invoice(self, *, academy, parent, status_value=Invoice.Status.DRAFT) -> Invoice:
        now = timezone.now()
        inv = Invoice.objects.create(
            academy=academy,
            parent=parent,
            invoice_number=f"INV-{academy.slug}-{now.timestamp()}",
            status=status_value,
            subtotal=Decimal("100.00"),
            discount_type=None,
            discount_value=None,
            discount_amount=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            total=Decimal("100.00"),
            due_date=now.date(),
            issued_date=now.date(),
            pdf_s3_key="",
            payment_link="",
            payment_link_expires_at=None,
        )
        return inv

    def _create_receipt(self, *, academy, invoice) -> Receipt:
        now = timezone.now()
        return Receipt.objects.create(
            academy=academy,
            invoice=invoice,
            receipt_number=f"RCP-{academy.slug}-{now.timestamp()}",
            amount=Decimal("20.00"),
            payment_method=Receipt.PaymentMethod.CARD,
            payment_date=now.date(),
            pdf_s3_key="",
        )

    @patch("tenant.notifications.signals.send_email_notification.delay")
    @patch("tenant.notifications.signals.send_whatsapp_notification.delay")
    def test_signals_invoice_pre_to_post_fires_both_tasks_when_status_moves_to_sent(
        self, mock_wa_delay, mock_email_delay
    ):
        invoice = self._create_invoice(
            academy=self.academy1,
            parent=self.parent1,
            status_value=Invoice.Status.DRAFT,
        )

        invoice.status = Invoice.Status.SENT
        invoice.save()

        mock_email_delay.assert_called_once_with("INVOICE", invoice.id)
        mock_wa_delay.assert_called_once_with("INVOICE", invoice.id)

    @patch("tenant.notifications.signals.send_email_notification.delay")
    @patch("tenant.notifications.signals.send_whatsapp_notification.delay")
    def test_signals_invoice_does_not_fire_when_status_already_sent(
        self, mock_wa_delay, mock_email_delay
    ):
        invoice = self._create_invoice(
            academy=self.academy1,
            parent=self.parent1,
            status_value=Invoice.Status.SENT,
        )

        invoice.notes = "update"
        invoice.save()

        mock_email_delay.assert_not_called()
        mock_wa_delay.assert_not_called()

    @patch("tenant.notifications.signals.send_email_notification.delay")
    @patch("tenant.notifications.signals.send_whatsapp_notification.delay")
    def test_signals_invoice_does_not_fire_when_status_is_draft(
        self, mock_wa_delay, mock_email_delay
    ):
        invoice = self._create_invoice(
            academy=self.academy1,
            parent=self.parent1,
            status_value=Invoice.Status.DRAFT,
        )

        invoice.notes = "still draft"
        invoice.save()

        mock_email_delay.assert_not_called()
        mock_wa_delay.assert_not_called()

    @patch("tenant.notifications.signals.send_email_notification.delay")
    @patch("tenant.notifications.signals.send_whatsapp_notification.delay")
    def test_signals_receipt_created_triggers_both_tasks_update_does_not(
        self, mock_wa_delay, mock_email_delay
    ):
        invoice = self._create_invoice(
            academy=self.academy1,
            parent=self.parent1,
            status_value=Invoice.Status.SENT,
        )

        receipt = self._create_receipt(academy=self.academy1, invoice=invoice)

        # Creation should fan-out both tasks once per channel.
        mock_email_delay.assert_called_once_with("RECEIPT", receipt.id)
        mock_wa_delay.assert_called_once_with("RECEIPT", receipt.id)

        # Updating an existing receipt should NOT re-fire notification tasks.
        mock_email_delay.reset_mock()
        mock_wa_delay.reset_mock()
        receipt.notes = "updated notes"
        receipt.save()

        mock_email_delay.assert_not_called()
        mock_wa_delay.assert_not_called()

    def test_webhook_returns_200_unauthenticated(self):
        payload = {"payment_id": "pm_test_123"}
        resp = self.client.post(
            "/api/v1/webhooks/payments/",
            payload,
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], "received")

    @patch("tenant.notifications.services.send_email_notification.delay")
    @patch("tenant.notifications.services.send_whatsapp_notification.delay")
    def test_resend_invoice_endpoint_returns_202_and_fires_both_tasks(
        self, mock_wa_delay, mock_email_delay
    ):
        invoice = self._create_invoice(
            academy=self.academy1,
            parent=self.parent1,
            status_value=Invoice.Status.SENT,
        )

        self.client.force_authenticate(user=self.admin1)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy1.id))

        resp = self.client.post(
            f"/api/v1/tenant/invoices/{invoice.id}/resend-notifications/",
            {},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_202_ACCEPTED)
        mock_email_delay.assert_called_once_with("INVOICE", invoice.id)
        mock_wa_delay.assert_called_once_with("INVOICE", invoice.id)

    @patch("tenant.notifications.services.send_email_notification.delay")
    @patch("tenant.notifications.services.send_whatsapp_notification.delay")
    def test_resend_receipt_endpoint_returns_202_and_fires_both_tasks(
        self, mock_wa_delay, mock_email_delay
    ):
        invoice = self._create_invoice(
            academy=self.academy1,
            parent=self.parent1,
            status_value=Invoice.Status.SENT,
        )
        receipt = self._create_receipt(academy=self.academy1, invoice=invoice)

        # Receipt creation itself triggers the signals; we only want to assert
        # the fan-out caused by the resend endpoint.
        mock_email_delay.reset_mock()
        mock_wa_delay.reset_mock()

        self.client.force_authenticate(user=self.admin1)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy1.id))

        resp = self.client.post(
            f"/api/v1/tenant/receipts/{receipt.id}/resend-notifications/",
            {},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_202_ACCEPTED)
        mock_email_delay.assert_called_once_with("RECEIPT", receipt.id)
        mock_wa_delay.assert_called_once_with("RECEIPT", receipt.id)

    @patch("tenant.notifications.services.send_email_notification.delay")
    @patch("tenant.notifications.services.send_whatsapp_notification.delay")
    def test_resend_invoice_rejects_other_academy_invoice(self, mock_wa_delay, mock_email_delay):
        invoice_other_academy = self._create_invoice(
            academy=self.academy2,
            parent=self.parent2,
            status_value=Invoice.Status.SENT,
        )

        self.client.force_authenticate(user=self.admin1)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy1.id))

        resp = self.client.post(
            f"/api/v1/tenant/invoices/{invoice_other_academy.id}/resend-notifications/",
            {},
            format="json",
        )

        self.assertIn(resp.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))
        mock_email_delay.assert_not_called()
        mock_wa_delay.assert_not_called()

    def test_notification_log_endpoints_return_academy_scoped_ordered_entries(self):
        invoice = self._create_invoice(
            academy=self.academy1,
            parent=self.parent1,
            status_value=Invoice.Status.SENT,
        )
        receipt = self._create_receipt(academy=self.academy1, invoice=invoice)

        older = NotificationLog.objects.create(
            academy=self.academy1,
            channel=NotificationLog.Channel.EMAIL,
            doc_type=NotificationLog.DocType.INVOICE,
            object_id=invoice.id,
            status=NotificationLog.Status.FAILED,
            recipient_email="old@example.com",
            recipient_phone="",
            error_detail="old error",
            sent_at=timezone.now() - timezone.timedelta(hours=2),
        )
        newer = NotificationLog.objects.create(
            academy=self.academy1,
            channel=NotificationLog.Channel.WHATSAPP,
            doc_type=NotificationLog.DocType.INVOICE,
            object_id=invoice.id,
            status=NotificationLog.Status.SENT,
            recipient_email="new@example.com",
            recipient_phone="+1555000111",
            error_detail="",
            sent_at=timezone.now() - timezone.timedelta(hours=1),
        )
        # Same object_id but wrong academy should not be returned.
        NotificationLog.objects.create(
            academy=self.academy2,
            channel=NotificationLog.Channel.EMAIL,
            doc_type=NotificationLog.DocType.INVOICE,
            object_id=invoice.id,
            status=NotificationLog.Status.SENT,
            recipient_email="other-academy@example.com",
            recipient_phone="",
            error_detail="",
            sent_at=timezone.now(),
        )

        # Receipt logs
        NotificationLog.objects.create(
            academy=self.academy1,
            channel=NotificationLog.Channel.EMAIL,
            doc_type=NotificationLog.DocType.RECEIPT,
            object_id=receipt.id,
            status=NotificationLog.Status.SENT,
            recipient_email="rcp@example.com",
            recipient_phone="",
            error_detail="",
            sent_at=timezone.now() - timezone.timedelta(minutes=30),
        )

        self.client.force_authenticate(user=self.admin1)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy1.id))

        inv_resp = self.client.get(f"/api/v1/tenant/invoices/{invoice.id}/notification-logs/")
        self.assertEqual(inv_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(inv_resp.data), 2)
        self.assertEqual(inv_resp.data[0]["channel"], newer.channel)
        self.assertEqual(inv_resp.data[0]["status"], newer.status)

        rcp_resp = self.client.get(f"/api/v1/tenant/receipts/{receipt.id}/notification-logs/")
        self.assertEqual(rcp_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(rcp_resp.data), 1)
        self.assertEqual(rcp_resp.data[0]["channel"], NotificationLog.Channel.EMAIL)

