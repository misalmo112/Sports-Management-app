from django.test import TestCase

from saas_platform.tenants.models import Academy, AcademyWhatsAppConfig


class AcademyWhatsAppConfigModelTest(TestCase):
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
            onboarding_completed=True,
        )

    def test_create_and_read_via_reverse_relation(self):
        config = AcademyWhatsAppConfig.objects.create(
            academy=self.academy,
            is_enabled=True,
        )

        fetched = self.academy.whatsapp_config
        self.assertEqual(fetched.pk, config.pk)
        self.assertTrue(fetched.is_enabled)

    def test_update_persists(self):
        config = AcademyWhatsAppConfig.objects.create(academy=self.academy)
        config.is_enabled = True
        config.phone_number_id = "1234567890"
        config.waba_id = "waba_test"
        config.save()

        fetched = self.academy.whatsapp_config
        self.assertTrue(fetched.is_enabled)
        self.assertEqual(fetched.phone_number_id, "1234567890")
        self.assertEqual(fetched.waba_id, "waba_test")

