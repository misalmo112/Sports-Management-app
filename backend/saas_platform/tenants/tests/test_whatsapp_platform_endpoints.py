from unittest.mock import patch

from cryptography.fernet import Fernet
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.tenants.models import Academy, AcademyWhatsAppConfig
from shared.utils.encryption import encrypt_value, decrypt_value
from tenant.notifications.models import NotificationLog

from django.contrib.auth import get_user_model


User = get_user_model()


class WhatsappPlatformEndpointsTest(TestCase):
    def setUp(self):
        # Ensure encryption utility uses a test key.
        self.fernet_key = Fernet.generate_key().decode("utf-8")
        import os

        os.environ["FERNET_SECRET_KEY"] = self.fernet_key

        # Reset cached fernet instance between tests.
        from shared.utils import encryption

        encryption._FERNET_INSTANCE = None

        self.client = APIClient()

        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy-wa",
            email="test-wa@example.com",
            onboarding_completed=True,
            country="ARE",
        )

        self.superadmin = User.objects.create_superuser(
            email="superadmin@example.com",
            password="testpass123",
            role=User.Role.ADMIN,
            is_active=True,
        )

        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="testpass123",
            role=User.Role.ADMIN,
            academy=self.academy,
            is_active=True,
            is_superuser=False,
            is_staff=False,
        )

    def _url_whatsapp_config(self, academy_id):
        return f"/api/v1/platform/academies/{academy_id}/whatsapp-config/"

    def _url_whatsapp_test_send(self, academy_id):
        return f"/api/v1/platform/academies/{academy_id}/whatsapp-config/test-send/"

    def _url_notification_logs(self, academy_id):
        return f"/api/v1/platform/academies/{academy_id}/notification-logs/"

    def test_get_whatsapp_config_masks_token(self):
        plaintext = "secret-token"
        config = AcademyWhatsAppConfig.objects.create(
            academy=self.academy,
            is_enabled=True,
            access_token_encrypted=encrypt_value(plaintext),
            phone_number_id="1234567890",
            waba_id="waba_test",
        )

        self.client.force_authenticate(user=self.superadmin)
        resp = self.client.get(self._url_whatsapp_config(self.academy.id))

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["access_token_encrypted"], "********")
        self.assertNotEqual(resp.data["access_token_encrypted"], plaintext)

        # Extra safety: ensure token decrypts correctly in the DB (not in response).
        config.refresh_from_db()
        self.assertEqual(decrypt_value(config.access_token_encrypted), plaintext)

    def test_put_creates_config_with_encrypted_token(self):
        self.client.force_authenticate(user=self.superadmin)

        payload = {
            "is_enabled": True,
            "send_on_invoice_created": True,
            "send_on_receipt_created": True,
            "phone_number_id": "1234567890",
            "access_token": "plaintext-token",
            "waba_id": "waba_test",
            "invoice_template_name": "academy_invoice_created",
            "receipt_template_name": "academy_receipt_issued",
            "template_language": "en",
        }

        resp = self.client.put(self._url_whatsapp_config(self.academy.id), payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        config = AcademyWhatsAppConfig.objects.get(academy=self.academy)
        self.assertNotEqual(config.access_token_encrypted, payload["access_token"])
        self.assertTrue(config.access_token_encrypted)
        self.assertEqual(resp.data["access_token_encrypted"], "********")

    def test_put_updates_config_without_overwriting_token_when_blank(self):
        existing_plain = "token1"
        existing_encrypted = encrypt_value(existing_plain)
        config = AcademyWhatsAppConfig.objects.create(
            academy=self.academy,
            is_enabled=True,
            access_token_encrypted=existing_encrypted,
            phone_number_id="1234567890",
            waba_id="waba_test",
        )

        self.client.force_authenticate(user=self.superadmin)

        resp = self.client.put(
            self._url_whatsapp_config(self.academy.id),
            {
                "is_enabled": False,
                "access_token": "",  # must not overwrite
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        config.refresh_from_db()
        self.assertEqual(config.access_token_encrypted, existing_encrypted)
        self.assertEqual(config.is_enabled, False)

    @patch("tenant.notifications.tasks.send_whatsapp_test_notification.delay")
    def test_test_send_fires_task_and_returns_202(self, mock_delay):
        AcademyWhatsAppConfig.objects.create(
            academy=self.academy,
            is_enabled=True,
            access_token_encrypted=encrypt_value("plaintext-token"),
            phone_number_id="1234567890",
            waba_id="waba_test",
        )

        self.client.force_authenticate(user=self.superadmin)
        resp = self.client.post(
            self._url_whatsapp_test_send(self.academy.id),
            {"phone_number": "+971501234567"},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_202_ACCEPTED)
        mock_delay.assert_called_once_with(str(self.academy.id), "+971501234567")

    def test_notification_logs_filters_by_channel_and_status(self):
        # WHATSAPP/SENT
        log_1 = NotificationLog.objects.create(
            academy=self.academy,
            channel=NotificationLog.Channel.WHATSAPP,
            doc_type=NotificationLog.DocType.INVOICE,
            object_id=1,
            recipient_email="",
            recipient_phone="+971111111111",
            status=NotificationLog.Status.SENT,
        )
        # WHATSAPP/FAILED
        NotificationLog.objects.create(
            academy=self.academy,
            channel=NotificationLog.Channel.WHATSAPP,
            doc_type=NotificationLog.DocType.INVOICE,
            object_id=2,
            recipient_email="",
            recipient_phone="+971222222222",
            status=NotificationLog.Status.FAILED,
        )
        # EMAIL/SENT
        NotificationLog.objects.create(
            academy=self.academy,
            channel=NotificationLog.Channel.EMAIL,
            doc_type=NotificationLog.DocType.RECEIPT,
            object_id=3,
            recipient_email="test@example.com",
            recipient_phone="",
            status=NotificationLog.Status.SENT,
        )

        self.client.force_authenticate(user=self.superadmin)
        resp = self.client.get(
            self._url_notification_logs(self.academy.id),
            {"channel": NotificationLog.Channel.WHATSAPP, "status": NotificationLog.Status.SENT},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        self.assertEqual(resp.data["count"], 1)
        result = resp.data["results"][0]
        self.assertEqual(result["channel"], NotificationLog.Channel.WHATSAPP)
        self.assertEqual(result["status"], NotificationLog.Status.SENT)
        self.assertEqual(result["object_id"], log_1.object_id)

    def test_platform_endpoints_reject_non_superadmin(self):
        self.client.force_authenticate(user=self.admin)

        resp1 = self.client.get(self._url_whatsapp_config(self.academy.id))
        self.assertEqual(resp1.status_code, status.HTTP_403_FORBIDDEN)

        resp2 = self.client.put(
            self._url_whatsapp_config(self.academy.id),
            {"is_enabled": True, "access_token": "token"},
            format="json",
        )
        self.assertEqual(resp2.status_code, status.HTTP_403_FORBIDDEN)

        resp3 = self.client.post(
            self._url_whatsapp_test_send(self.academy.id),
            {"phone_number": "+971501234567"},
            format="json",
        )
        self.assertEqual(resp3.status_code, status.HTTP_403_FORBIDDEN)

        resp4 = self.client.get(
            self._url_notification_logs(self.academy.id),
            {"channel": NotificationLog.Channel.WHATSAPP},
        )
        self.assertEqual(resp4.status_code, status.HTTP_403_FORBIDDEN)

