"""
Tests for platform masters API (Currency, Timezone).
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.masters.models import Currency, Timezone, Country
from saas_platform.tenants.models import Academy

User = get_user_model()


class PlatformCurrencyViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.superadmin = User.objects.create_superuser(
            email='superadmin@platform.test',
            password='testpass123',
            role=User.Role.ADMIN,
            is_active=True,
        )
        self.currency = Currency.objects.create(
            code='XYZ',
            name='Test Currency',
            is_active=True,
            sort_order=0,
        )

    def test_list_currencies_requires_platform_admin(self):
        response = self.client.get('/api/v1/platform/masters/currencies/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_currencies_as_superadmin(self):
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get('/api/v1/platform/masters/currencies/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        codes = [r['code'] for r in response.data['results']]
        self.assertIn('XYZ', codes)

    def test_create_currency(self):
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.post(
            '/api/v1/platform/masters/currencies/',
            {'code': 'ABC', 'name': 'Alpha', 'is_active': True, 'sort_order': 1},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['code'], 'ABC')
        self.assertTrue(Currency.objects.filter(code='ABC').exists())

    def test_retrieve_currency(self):
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get(f'/api/v1/platform/masters/currencies/{self.currency.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['code'], 'XYZ')

    def test_update_currency(self):
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.patch(
            f'/api/v1/platform/masters/currencies/{self.currency.id}/',
            {'name': 'Updated Name'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.currency.refresh_from_db()
        self.assertEqual(self.currency.name, 'Updated Name')

    def test_delete_currency_unused(self):
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.delete(f'/api/v1/platform/masters/currencies/{self.currency.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Currency.objects.filter(id=self.currency.id).exists())


class PlatformTimezoneViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.superadmin = User.objects.create_superuser(
            email='superadmin-tz@platform.test',
            password='testpass123',
            role=User.Role.ADMIN,
            is_active=True,
        )
        self.timezone = Timezone.objects.create(
            code='Test/Zone',
            name='Test Zone',
            is_active=True,
            sort_order=0,
        )

    def test_list_timezones_requires_platform_admin(self):
        response = self.client.get('/api/v1/platform/masters/timezones/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_timezones_as_superadmin(self):
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get('/api/v1/platform/masters/timezones/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        codes = [r['code'] for r in response.data['results']]
        self.assertIn('Test/Zone', codes)

    def test_create_timezone(self):
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.post(
            '/api/v1/platform/masters/timezones/',
            {'code': 'Another/Zone', 'is_active': True, 'sort_order': 1},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['code'], 'Another/Zone')
        self.assertTrue(Timezone.objects.filter(code='Another/Zone').exists())


class PlatformCountryViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.superadmin = User.objects.create_superuser(
            email='superadmin-country@platform.test',
            password='testpass123',
            role=User.Role.ADMIN,
            is_active=True,
        )
        self.country = Country.objects.create(
            code='ARE',
            name='United Arab Emirates',
            phone_code='+971',
            region='Middle East',
            is_active=True,
            sort_order=0,
        )

    def test_list_countries_requires_platform_admin(self):
        response = self.client.get('/api/v1/platform/masters/countries/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_countries_as_superadmin(self):
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get('/api/v1/platform/masters/countries/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        codes = [r['code'] for r in response.data['results']]
        self.assertIn('ARE', codes)

    def test_create_country(self):
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.post(
            '/api/v1/platform/masters/countries/',
            {'code': 'USA', 'name': 'United States of America', 'is_active': True, 'sort_order': 1},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['code'], 'USA')
        self.assertTrue(Country.objects.filter(code='USA').exists())

    def test_retrieve_country(self):
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get(f'/api/v1/platform/masters/countries/{self.country.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['code'], 'ARE')

    def test_update_country(self):
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.patch(
            f'/api/v1/platform/masters/countries/{self.country.id}/',
            {'name': 'Updated UAE'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.country.refresh_from_db()
        self.assertEqual(self.country.name, 'Updated UAE')

    def test_delete_country_unused(self):
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.delete(f'/api/v1/platform/masters/countries/{self.country.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Country.objects.filter(id=self.country.id).exists())

    def test_delete_country_blocked_when_in_use_by_academy(self):
        self.client.force_authenticate(user=self.superadmin)
        academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='academy@example.com',
            country='ARE',
        )
        self.assertIsNotNone(academy.id)

        response = self.client.delete(f'/api/v1/platform/masters/countries/{self.country.id}/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Country.objects.filter(id=self.country.id).exists())
