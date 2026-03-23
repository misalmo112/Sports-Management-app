from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.tenants.models import Academy

User = get_user_model()


class TenantAcademyTaxSettingsViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.academy = Academy.objects.create(
            name="Falcons Academy",
            slug="falcons-academy",
            email="hello@falcons.test",
            onboarding_completed=True,
        )

        self.admin = User.objects.create_user(
            email="admin@falcons.test",
            password="SecurePassword123!",
            role="ADMIN",
            academy=self.academy,
            is_active=True,
            is_verified=True,
        )

        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

    def test_get_academy_tax_settings_returns_defaults(self):
        response = self.client.get('/api/v1/tenant/academy/tax-settings/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['global_tax_enabled'], False)
        self.assertEqual(Decimal(str(response.data['global_tax_rate_percent'])), Decimal('0.00'))

    def test_patch_academy_tax_settings_updates_fields(self):
        response = self.client.patch(
            '/api/v1/tenant/academy/tax-settings/',
            {
                'global_tax_enabled': True,
                'global_tax_rate_percent': '18.50',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.academy.refresh_from_db()
        self.assertEqual(self.academy.global_tax_enabled, True)
        self.assertEqual(self.academy.global_tax_rate_percent, Decimal('18.50'))

    def test_patch_academy_tax_settings_can_disable_without_rate(self):
        # First enable with a non-zero rate
        self.academy.global_tax_enabled = True
        self.academy.global_tax_rate_percent = Decimal('9.99')
        self.academy.save()

        response = self.client.patch(
            '/api/v1/tenant/academy/tax-settings/',
            {
                'global_tax_enabled': False,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.academy.refresh_from_db()
        self.assertEqual(self.academy.global_tax_enabled, False)

