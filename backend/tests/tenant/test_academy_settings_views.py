from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.quotas.models import TenantQuota, TenantUsage
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from saas_platform.tenants.models import Academy
from saas_platform.masters.models import Currency, Timezone

User = get_user_model()


class TenantAcademySettingsViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Seed master-data required by AcademySettingsSerializer validations.
        Timezone.objects.create(code='Asia/Dubai', name='Asia/Dubai', is_active=True, sort_order=0)
        Currency.objects.create(code='AED', name='UAE Dirham', is_active=True, sort_order=0)

        self.academy = Academy.objects.create(
            name='Falcons Academy',
            slug='falcons-academy',
            email='hello@falcons.test',
            phone='+971555000001',
            website='https://falcons.test',
            address_line1='123 Academy Street',
            city='Dubai',
            country='UAE',
            onboarding_completed=True,
            timezone='UTC',
            currency='USD',
        )
        self.admin = User.objects.create_user(
            email='admin@falcons.test',
            password='SecurePassword123!',
            role='ADMIN',
            academy=self.academy,
            is_active=True,
            is_verified=True,
        )
        self.plan = Plan.objects.create(
            name='Growth',
            slug='growth',
            description='Growth plan',
            price_monthly='49.00',
            price_yearly='490.00',
            currency='USD',
            trial_days=14,
            limits_json={
                'storage_bytes': 1073741824,
                'max_students': 150,
                'max_coaches': 12,
                'max_admins': 4,
                'max_classes': 40,
            },
        )
        Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at='2026-01-01T00:00:00Z',
            overrides_json={'max_students': 175},
        )
        TenantQuota.objects.update_or_create(
            academy=self.academy,
            defaults={
                'storage_bytes_limit': 1073741824,
                'max_students': 175,
                'max_coaches': 12,
                'max_admins': 4,
                'max_classes': 40,
            },
        )
        TenantUsage.objects.update_or_create(
            academy=self.academy,
            defaults={
                'storage_used_bytes': 2048,
                'students_count': 83,
                'coaches_count': 6,
                'admins_count': 2,
                'classes_count': 19,
            },
        )
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

    def test_get_academy_settings_returns_full_profile(self):
        response = self.client.get('/api/v1/tenant/academy/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], self.academy.name)
        self.assertEqual(response.data['phone'], self.academy.phone)
        self.assertEqual(response.data['address_line1'], self.academy.address_line1)
        self.assertEqual(response.data['country'], self.academy.country)

    def test_patch_academy_settings_updates_profile(self):
        response = self.client.patch(
            '/api/v1/tenant/academy/',
            {
                'name': 'Falcons Elite Academy',
                'email': 'team@falcons.test',
                'phone': '+971555999999',
                'website': 'https://elite.falcons.test',
                'city': 'Abu Dhabi',
                'timezone': 'Asia/Dubai',
                'currency': 'AED',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.academy.refresh_from_db()
        self.assertEqual(self.academy.name, 'Falcons Elite Academy')
        self.assertEqual(self.academy.email, 'team@falcons.test')
        self.assertEqual(self.academy.currency, 'AED')
        self.assertEqual(self.academy.timezone, 'Asia/Dubai')

    def test_get_subscription_summary_returns_current_subscription(self):
        response = self.client.get('/api/v1/tenant/academy/subscription/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['academy_id'], str(self.academy.id))
        self.assertEqual(response.data['current_subscription']['status'], SubscriptionStatus.ACTIVE)
        self.assertEqual(response.data['current_subscription']['plan_details']['name'], self.plan.name)

    @patch('saas_platform.analytics.services.StatsService.get_academy_db_size_bytes', return_value=512)
    def test_get_usage_summary_returns_quota_and_usage(self, _mock_db_size):
        response = self.client.get('/api/v1/tenant/academy/usage/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['quota']['max_students'], 175)
        self.assertEqual(response.data['usage']['students_count'], 83)
        self.assertEqual(response.data['usage']['total_used_bytes'], 512)
