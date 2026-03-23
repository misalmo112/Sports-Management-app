"""
Phase 2 Slice A: STAFF with operations modules only may use students/classes/attendance APIs;
finance-items (items list) returns 403. OWNER / full ADMIN unchanged.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from saas_platform.tenants.models import Academy

User = get_user_model()


class StaffOperationsModuleEnforcementAPITest(TestCase):
    """APIClient integration: module gating for Slice A vs finance-items."""

    def setUp(self):
        self.client = APIClient()
        self.academy = Academy.objects.create(
            name='Ops Module Academy',
            slug='ops-module-academy',
            email='ops@example.com',
            onboarding_completed=True,
        )
        self.plan = Plan.objects.create(
            name='Basic Ops',
            slug='basic-ops-module',
            limits_json={
                'max_students': 100,
                'max_coaches': 10,
                'max_admins': 5,
                'max_classes': 50,
            },
        )
        Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now(),
        )

        self.staff_ops = User.objects.create_user(
            email='staff.ops@example.com',
            password='SecurePassword123!',
            role=User.Role.STAFF,
            academy=self.academy,
            is_active=True,
            is_verified=True,
            allowed_modules=['students', 'classes', 'attendance'],
        )
        self.admin_full = User.objects.create_user(
            email='admin.full@example.com',
            password='SecurePassword123!',
            role=User.Role.ADMIN,
            academy=self.academy,
            is_active=True,
            is_verified=True,
            allowed_modules=None,
        )
        self.owner = User.objects.create_user(
            email='owner@example.com',
            password='SecurePassword123!',
            role=User.Role.OWNER,
            academy=self.academy,
            is_active=True,
            is_verified=True,
            allowed_modules=None,
        )

    def _auth(self, user):
        self.client.force_authenticate(user=user)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

    def test_staff_operations_slice_lists_return_200(self):
        self._auth(self.staff_ops)
        for path in (
            '/api/v1/tenant/students/',
            '/api/v1/tenant/classes/',
            '/api/v1/tenant/attendance/',
        ):
            with self.subTest(path=path):
                res = self.client.get(path)
                self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)

    def test_staff_operations_slice_forbidden_finance_items_403(self):
        self._auth(self.staff_ops)
        res = self.client.get('/api/v1/tenant/items/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_null_allowed_modules_items_200(self):
        self._auth(self.admin_full)
        res = self.client.get('/api/v1/tenant/items/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_owner_items_200(self):
        self._auth(self.owner)
        res = self.client.get('/api/v1/tenant/items/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
