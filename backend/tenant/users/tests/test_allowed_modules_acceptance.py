"""
Evidence tests for module-based STAFF acceptance criteria.

Maps to checklist:
- Migration-safe defaults / logins (nullable column, existing-style users)
- HTTP 400 + field errors for bad module keys (API)
- OWNER / full ADMIN effective access (see also test_staff_modules.TenantModulePermissionTest)
- STAFF write/read roundtrip (API)
- My Account without module grant (IsAuthenticatedAcademyUser)
"""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from saas_platform.tenants.models import Academy
from tenant.users.models import InviteToken

User = get_user_model()


def _allowed_modules_error_messages(response_data: dict) -> list[str]:
    """Normalize DRF validation errors wrapped by the project's exception handler."""
    details = response_data.get('details') or {}
    block = details.get('allowed_modules')
    if isinstance(block, dict) and 'allowed_modules' in block:
        return [str(x) for x in block['allowed_modules']]
    if isinstance(block, list):
        return [str(x) for x in block]
    return []


class AllowedModulesMigrationLoginEvidenceTest(TestCase):
    """
    Acceptance: migration 0006 adds nullable `allowed_modules`; legacy-style rows = NULL.

    Django's test DB runs all migrations from scratch; we model a populated tenant by
    creating multiple users without setting `allowed_modules` and assert they stay NULL
    and can authenticate (logins not broken).
    """

    def setUp(self):
        self.client = APIClient()
        self.academy = Academy.objects.create(
            name='Legacy Academy',
            slug='legacy-academy',
            email='legacy@example.com',
        )

    def test_new_users_default_allowed_modules_null_and_login_succeeds(self):
        users_data = [
            ('admin_pop@example.com', User.Role.ADMIN),
            ('owner_pop@example.com', User.Role.OWNER),
            ('coach_pop@example.com', User.Role.COACH),
        ]
        for email, role in users_data:
            u = User.objects.create_user(
                email=email,
                password='SecurePassword123!',
                role=role,
                academy=self.academy,
                is_active=True,
                is_verified=True,
            )
            u.refresh_from_db()
            self.assertIsNone(
                u.allowed_modules,
                f'{email} should default allowed_modules to NULL (post-migration row shape)',
            )

            res = self.client.post(
                '/api/v1/auth/token/',
                {'email': email, 'password': 'SecurePassword123!'},
                format='json',
            )
            self.assertEqual(
                res.status_code,
                status.HTTP_200_OK,
                f'Login must succeed for {email} with NULL allowed_modules',
            )
            self.assertIn('access', res.data)


class StaffInviteApiValidationTest(TestCase):
    """Acceptance: invalid / forbidden module keys -> HTTP 400 with allowed_modules errors."""

    def setUp(self):
        self.client = APIClient()
        self.academy = Academy.objects.create(
            name='API Academy',
            slug='api-academy-accept',
            email='api@example.com',
            onboarding_completed=True,
        )
        self.plan = Plan.objects.create(
            name='Basic Plan',
            slug='basic-plan-accept',
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
        self.admin = User.objects.create_user(
            email='admin@api-academy-accept.com',
            role=User.Role.ADMIN,
            academy=self.academy,
            is_active=True,
            is_verified=True,
        )
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

    def test_post_staff_invite_persists_first_and_last_name(self):
        """Names from the invite form must be stored on the user and exposed on validate-invite."""
        with patch('tenant.users.services.UserService.send_invite_email_async'):
            create_res = self.client.post(
                '/api/v1/admin/users/staff/',
                {
                    'email': 'staff-names@example.com',
                    'allowed_modules': ['students'],
                    'first_name': 'Jamie',
                    'last_name': 'Rivera',
                },
                format='json',
            )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email='staff-names@example.com')
        self.assertEqual(user.first_name, 'Jamie')
        self.assertEqual(user.last_name, 'Rivera')
        invite_row = InviteToken.objects.get(user=user, used_at__isnull=True)
        token = invite_row.token_plain
        self.assertTrue(token)
        from urllib.parse import quote

        val_res = self.client.get(
            f'/api/v1/auth/invite/validate/?token={quote(token, safe="")}',
        )
        self.assertEqual(val_res.status_code, status.HTTP_200_OK)
        self.assertEqual(val_res.data['data']['first_name'], 'Jamie')
        self.assertEqual(val_res.data['data']['last_name'], 'Rivera')

    def test_post_staff_unknown_module_key_returns_400(self):
        with patch('tenant.users.services.UserService.send_invite_email_async'):
            response = self.client.post(
                '/api/v1/admin/users/staff/',
                {
                    'email': 'staff-unknown@example.com',
                    'allowed_modules': ['students', 'not-a-registered-module-key'],
                },
                format='json',
            )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        msgs = _allowed_modules_error_messages(response.data)
        self.assertTrue(msgs, msg=f'Expected nested validation details, got {response.data!r}')
        self.assertTrue(any('unknown' in m.lower() for m in msgs))

    def test_post_staff_forbidden_module_key_returns_400(self):
        with patch('tenant.users.services.UserService.send_invite_email_async'):
            response = self.client.post(
                '/api/v1/admin/users/staff/',
                {
                    'email': 'staff-forbidden@example.com',
                    'allowed_modules': ['students', 'users'],
                },
                format='json',
            )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        msgs = _allowed_modules_error_messages(response.data)
        self.assertTrue(msgs, msg=f'Expected nested validation details, got {response.data!r}')
        joined = ' '.join(m.lower() for m in msgs)
        self.assertTrue(
            'cannot' in joined or 'grant' in joined or 'staff' in joined,
            msg=f'Expected clear forbidden-modules message, got: {msgs!r}',
        )

    def test_post_staff_invite_alias_unknown_module_returns_400(self):
        """Generic invite with role STAFF must reject unknown keys the same as /staff/."""
        with patch('tenant.users.services.UserService.send_invite_email_async'):
            response = self.client.post(
                '/api/v1/admin/users/invite/',
                {
                    'email': 'staff-invite-bad@example.com',
                    'role': 'STAFF',
                    'allowed_modules': ['invalid-module-xyz'],
                },
                format='json',
            )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        msgs = _allowed_modules_error_messages(response.data)
        self.assertTrue(any('unknown' in m.lower() for m in msgs))

    def test_post_staff_then_get_detail_roundtrip_allowed_modules(self):
        """Acceptance: write then read returns identical allowed_modules for STAFF."""
        modules = ['students', 'classes', 'attendance']
        with patch('tenant.users.services.UserService.send_invite_email_async'):
            create_res = self.client.post(
                '/api/v1/admin/users/staff/',
                {
                    'email': 'staff-roundtrip@example.com',
                    'allowed_modules': modules,
                },
                format='json',
            )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED, create_res.data)
        self.assertEqual(create_res.data['allowed_modules'], modules)
        uid = create_res.data['id']

        get_res = self.client.get(f'/api/v1/admin/users/{uid}/')
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_res.data['allowed_modules'], modules)


class MyAccountWithoutModuleGrantTest(TestCase):
    """Acceptance: my-account policy — no tenant module grant required (backend)."""

    def setUp(self):
        self.client = APIClient()
        self.academy = Academy.objects.create(
            name='Staff Academy',
            slug='staff-academy-acct',
            email='staff-ac@example.com',
            onboarding_completed=True,
        )
        self.staff = User.objects.create_user(
            email='minimal@example.com',
            password='SecurePassword123!',
            role=User.Role.STAFF,
            academy=self.academy,
            is_active=True,
            is_verified=True,
            allowed_modules=['students'],
        )

    def test_staff_without_settings_home_can_get_patch_account(self):
        self.assertNotIn('settings-home', self.staff.allowed_modules)
        self.client.force_authenticate(user=self.staff)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

        get_res = self.client.get('/api/v1/tenant/account/')
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_res.data['allowed_modules'], ['students'])

        patch_res = self.client.patch(
            '/api/v1/tenant/account/',
            {'first_name': 'Pat'},
            format='json',
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data['allowed_modules'], ['students'])
