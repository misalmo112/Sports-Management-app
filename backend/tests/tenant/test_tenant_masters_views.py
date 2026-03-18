"""
Tests for tenant masters API (currencies, timezones) - read from platform models.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.masters.models import Currency, Timezone
from saas_platform.tenants.models import Academy

User = get_user_model()


class TenantMastersViewsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='admin@test.test',
            onboarding_completed=True,
            timezone='UTC',
            currency='USD',
        )
        self.admin = User.objects.create_user(
            email='admin@test.test',
            password='testpass123',
            role='ADMIN',
            academy=self.academy,
            is_active=True,
            is_verified=True,
        )
        Currency.objects.create(code='AAA', is_active=True, sort_order=0)
        Currency.objects.create(code='BBB', is_active=False, sort_order=1)
        Timezone.objects.create(code='Active/TZ', is_active=True, sort_order=0)
        Timezone.objects.create(code='Inactive/TZ', is_active=False, sort_order=1)
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

    def test_currencies_returns_only_active(self):
        response = self.client.get('/api/v1/tenant/masters/currencies/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('currencies', response.data)
        codes = response.data['currencies']
        self.assertIn('AAA', codes)
        self.assertNotIn('BBB', codes)

    def test_timezones_returns_only_active(self):
        response = self.client.get('/api/v1/tenant/masters/timezones/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('timezones', response.data)
        codes = response.data['timezones']
        self.assertIn('Active/TZ', codes)
        self.assertNotIn('Inactive/TZ', codes)
