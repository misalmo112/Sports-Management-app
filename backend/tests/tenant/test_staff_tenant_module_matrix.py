"""
Phase 3: table-driven API checks for STAFF module gating across tenant admin routes.

See docs/HANDOFF_MODULE_BASED_STAFF.md (Phase 3 matrix) and docs/MODULE_ACCESS.md.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from saas_platform.tenants.models import Academy

User = get_user_model()


def _academy_with_subscription():
    academy = Academy.objects.create(
        name='Module Matrix Academy',
        slug='module-matrix-academy',
        email='matrix@example.com',
        onboarding_completed=True,
    )
    plan = Plan.objects.create(
        name='Matrix Plan',
        slug='matrix-plan',
        limits_json={
            'max_students': 100,
            'max_coaches': 10,
            'max_admins': 5,
            'max_classes': 50,
        },
    )
    Subscription.objects.create(
        academy=academy,
        plan=plan,
        status=SubscriptionStatus.ACTIVE,
        is_current=True,
        start_at=timezone.now(),
    )
    return academy


class StaffTenantModuleMatrixAPITest(TestCase):
    """STAFF allowed_modules: positive probe per assignable key; negative probe; reports + setup split."""

    @classmethod
    def setUpTestData(cls):
        cls.academy = _academy_with_subscription()
        cls.owner = User.objects.create_user(
            email='matrix.owner@example.com',
            password='SecurePassword123!',
            role=User.Role.OWNER,
            academy=cls.academy,
            is_active=True,
            is_verified=True,
            allowed_modules=None,
        )
        cls.admin_full = User.objects.create_user(
            email='matrix.admin@example.com',
            password='SecurePassword123!',
            role=User.Role.ADMIN,
            academy=cls.academy,
            is_active=True,
            is_verified=True,
            allowed_modules=None,
        )

    def setUp(self):
        self.client = APIClient()

    def _auth(self, user):
        self.client.force_authenticate(user=user)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

    def _staff(self, email_suffix, modules):
        return User.objects.create_user(
            email=f'matrix.{email_suffix}@example.com',
            password='SecurePassword123!',
            role=User.Role.STAFF,
            academy=self.academy,
            is_active=True,
            is_verified=True,
            allowed_modules=list(modules),
        )

    def test_staff_single_module_positive_get(self):
        """
        Each STAFF-assignable module key: at least one cheap GET returns 200.
        Keys not assignable to STAFF (users, academy-settings, bulk-actions) are covered by negatives.
        """
        cases = [
            ('admin-overview', ['admin-overview'], '/api/v1/tenant/overview/', None),
            ('students', ['students'], '/api/v1/tenant/students/', None),
            ('classes', ['classes'], '/api/v1/tenant/classes/', None),
            ('attendance', ['attendance'], '/api/v1/tenant/attendance/', None),
            ('finance-items', ['finance-items'], '/api/v1/tenant/items/', None),
            ('invoices', ['invoices'], '/api/v1/tenant/invoices/', None),
            ('receipts', ['receipts'], '/api/v1/tenant/receipts/', None),
            ('media', ['media'], '/api/v1/tenant/media/', None),
            ('reports', ['reports'], '/api/v1/tenant/reports/', {'report_type': 'attendance'}),
            (
                'finance-overview',
                ['finance-overview'],
                '/api/v1/tenant/reports/',
                {'report_type': 'finance_overview'},
            ),
            (
                'finance-overview-export',
                ['finance-overview'],
                '/api/v1/tenant/reports/export/',
                # Omit `format` query param: DRF treats `format` specially; view defaults fmt to csv.
                {'report_type': 'finance_overview'},
            ),
            ('facilities', ['facilities'], '/api/v1/tenant/facilities/rent-configs/', None),
            ('staff', ['staff'], '/api/v1/tenant/coaches/', None),
            ('feedback', ['feedback'], '/api/v1/tenant/feedback/', None),
            ('organization-settings', ['organization-settings'], '/api/v1/tenant/academy/', None),
            (
                'organization-settings-countries',
                ['organization-settings'],
                '/api/v1/tenant/masters/countries/',
                None,
            ),
            ('tax-settings', ['tax-settings'], '/api/v1/tenant/academy/tax-settings/', None),
            ('locations', ['locations'], '/api/v1/tenant/locations/', None),
            ('usage-settings', ['usage-settings'], '/api/v1/tenant/academy/usage/', None),
            ('sports', ['sports'], '/api/v1/tenant/sports/', None),
            ('sports-age', ['sports'], '/api/v1/tenant/age-categories/', None),
            ('terms', ['terms'], '/api/v1/tenant/terms/', None),
            ('currencies', ['currencies'], '/api/v1/tenant/masters/currencies/', None),
            ('timezones', ['timezones'], '/api/v1/tenant/masters/timezones/', None),
            ('setup-checklist', ['setup'], '/api/v1/tenant/onboarding/checklist/', None),
            ('setup-templates', ['setup'], '/api/v1/tenant/onboarding/templates/', None),
        ]
        for name, modules, path, query in cases:
            with self.subTest(case=name):
                user = self._staff(f'pos-{name}', modules)
                self._auth(user)
                if query:
                    res = self.client.get(path, query)
                else:
                    res = self.client.get(path)
                self.assertEqual(
                    res.status_code,
                    status.HTTP_200_OK,
                    (name, res.status_code, getattr(res, 'data', res.content)),
                )

    def test_staff_students_only_forbidden_other_modules(self):
        """Single-module STAFF (students) receives 403 on unrelated tenant admin reads."""
        user = self._staff('narrow-students', ['students'])
        self._auth(user)
        forbidden = [
            ('/api/v1/tenant/overview/', None),
            ('/api/v1/tenant/classes/', None),
            ('/api/v1/tenant/attendance/', None),
            ('/api/v1/tenant/items/', None),
            ('/api/v1/tenant/invoices/', None),
            ('/api/v1/tenant/receipts/', None),
            ('/api/v1/tenant/media/', None),
            ('/api/v1/tenant/reports/', {'report_type': 'attendance'}),
            ('/api/v1/tenant/reports/', {'report_type': 'finance_overview'}),
            (
                '/api/v1/tenant/reports/export/',
                {'report_type': 'finance_overview'},
            ),
            ('/api/v1/tenant/facilities/rent-configs/', None),
            ('/api/v1/tenant/coaches/', None),
            ('/api/v1/tenant/feedback/', None),
            ('/api/v1/tenant/academy/', None),
            ('/api/v1/tenant/academy/tax-settings/', None),
            ('/api/v1/tenant/academy/subscription/', None),
            ('/api/v1/tenant/academy/usage/', None),
            ('/api/v1/tenant/locations/', None),
            ('/api/v1/tenant/sports/', None),
            ('/api/v1/tenant/terms/', None),
            ('/api/v1/tenant/age-categories/', None),
            ('/api/v1/tenant/masters/timezones/', None),
            ('/api/v1/tenant/masters/currencies/', None),
            ('/api/v1/tenant/masters/countries/', None),
            ('/api/v1/tenant/bulk-imports/students/schema/', None),
            ('/api/v1/tenant/users/', None),
            ('/api/v1/tenant/onboarding/checklist/', None),
            ('/api/v1/tenant/onboarding/templates/', None),
        ]
        for path, query in forbidden:
            with self.subTest(path=path, query=query):
                if query:
                    res = self.client.get(path, query)
                else:
                    res = self.client.get(path)
                self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN, res.data)

    def test_reports_module_split_finance_overview_vs_reports(self):
        """reports key does not grant finance_overview; finance-overview key does not grant other report types."""
        u_reports = self._staff('only-reports', ['reports'])
        self._auth(u_reports)
        r1 = self.client.get('/api/v1/tenant/reports/', {'report_type': 'attendance'})
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        r2 = self.client.get('/api/v1/tenant/reports/', {'report_type': 'finance_overview'})
        self.assertEqual(r2.status_code, status.HTTP_403_FORBIDDEN)

        u_fo = self._staff('only-finance-overview', ['finance-overview'])
        self._auth(u_fo)
        r3 = self.client.get('/api/v1/tenant/reports/', {'report_type': 'finance_overview'})
        self.assertEqual(r3.status_code, status.HTTP_200_OK)
        r4 = self.client.get('/api/v1/tenant/reports/', {'report_type': 'attendance'})
        self.assertEqual(r4.status_code, status.HTTP_403_FORBIDDEN)

    def test_setup_module_wizard_still_owner_admin_only(self):
        """STAFF with setup can read state (dashboard guard) and checklist; cannot POST wizard steps."""
        u = self._staff('only-setup', ['setup'])
        self._auth(u)
        self.assertEqual(
            self.client.get('/api/v1/tenant/onboarding/checklist/').status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            self.client.get('/api/v1/tenant/onboarding/templates/').status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            self.client.get('/api/v1/tenant/onboarding/state/').status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            self.client.post('/api/v1/tenant/onboarding/step/1/', {}, format='json').status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_staff_without_module_my_account_still_allowed(self):
        u = self._staff('students-acct', ['students'])
        self._auth(u)
        res = self.client.get('/api/v1/tenant/account/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_owner_admin_smoke_unscoped_lists(self):
        for user in (self.owner, self.admin_full):
            with self.subTest(role=user.role):
                self._auth(user)
                self.assertEqual(self.client.get('/api/v1/tenant/items/').status_code, status.HTTP_200_OK)
                self.assertEqual(self.client.get('/api/v1/tenant/users/').status_code, status.HTTP_200_OK)
                self.assertEqual(
                    self.client.get('/api/v1/tenant/academy/subscription/').status_code,
                    status.HTTP_200_OK,
                )
