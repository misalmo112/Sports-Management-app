from django.test import TestCase

from saas_platform.tenants.models import Academy
from tenant.notifications.models import NotificationLog


class NotificationLogModelTest(TestCase):
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
            onboarding_completed=True,
        )

    def test_create_notification_log_with_all_statuses(self):
        object_id = 123

        for status in [
            NotificationLog.Status.SENT,
            NotificationLog.Status.FAILED,
            NotificationLog.Status.SKIPPED,
        ]:
            log = NotificationLog.objects.create(
                academy=self.academy,
                channel=NotificationLog.Channel.WHATSAPP,
                doc_type=NotificationLog.DocType.INVOICE,
                object_id=object_id,
                status=status,
                recipient_phone="1234567890",
            )
            self.assertEqual(log.status, status)

