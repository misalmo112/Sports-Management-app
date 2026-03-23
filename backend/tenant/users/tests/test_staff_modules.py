"""Tests for STAFF role and tenant module validation."""
from django.test import TestCase, RequestFactory
from unittest.mock import MagicMock
from django.core.exceptions import ValidationError

from saas_platform.tenants.models import Academy
from tenant.users.models import User
from shared.permissions.module_keys import TENANT_MODULE_KEYS, validate_allowed_modules_for_staff
from shared.permissions.tenant import (
    IsTenantAdmin,
    has_full_tenant_dashboard_module_access,
    tenant_dashboard_actor_has_module,
    user_has_tenant_module,
)


class ModuleKeysValidationTest(TestCase):
    def test_staff_unknown_module_key_rejected_with_clear_message(self):
        """Acceptance: unknown keys rejected; API maps this to HTTP 400 (see test_views)."""
        with self.assertRaises(ValidationError) as ctx:
            validate_allowed_modules_for_staff(['students', 'totally-bogus-module'])
        err = ctx.exception.message_dict.get('allowed_modules', '')
        self.assertIn('Unknown module key', str(err))
        self.assertIn('totally-bogus-module', str(err))

    def test_staff_forbidden_module_rejected(self):
        with self.assertRaises(ValidationError):
            validate_allowed_modules_for_staff(['students', 'users'])

    def test_staff_empty_rejected(self):
        with self.assertRaises(ValidationError):
            validate_allowed_modules_for_staff([])

    def test_staff_none_rejected(self):
        with self.assertRaises(ValidationError):
            validate_allowed_modules_for_staff(None)


class UserStaffModelTest(TestCase):
    def setUp(self):
        self.academy = Academy.objects.create(
            name='Academy',
            slug='academy-staff-test',
            email='a@example.com',
        )

    def test_staff_requires_allowed_modules(self):
        with self.assertRaises(ValidationError):
            User.objects.create_user(
                email='s1@example.com',
                role=User.Role.STAFF,
                academy=self.academy,
                allowed_modules=None,
            )

    def test_admin_may_not_set_allowed_modules(self):
        with self.assertRaises(ValidationError):
            u = User(
                email='a1@example.com',
                role=User.Role.ADMIN,
                academy=self.academy,
                allowed_modules=['students'],
            )
            u.save()

    def test_staff_valid_modules(self):
        u = User.objects.create_user(
            email='s2@example.com',
            role=User.Role.STAFF,
            academy=self.academy,
            allowed_modules=['students', 'classes'],
        )
        self.assertEqual(u.allowed_modules, ['students', 'classes'])


class TenantModulePermissionTest(TestCase):
    def setUp(self):
        self.academy = Academy.objects.create(
            name='Academy',
            slug='academy-mod-perm',
            email='b@example.com',
        )
        self.factory = RequestFactory()

    def test_tenant_dashboard_actor_has_module_owner(self):
        u = MagicMock()
        u.role = 'OWNER'
        self.assertTrue(tenant_dashboard_actor_has_module(u, 'students'))

    def test_owner_full_access_all_registered_module_keys(self):
        """Acceptance: OWNER retains full effective access (every tenant module key)."""
        u = MagicMock()
        u.role = 'OWNER'
        for key in TENANT_MODULE_KEYS:
            self.assertTrue(
                tenant_dashboard_actor_has_module(u, key),
                f'OWNER should pass module {key!r}',
            )

    def test_admin_null_allowed_modules_full_access_all_registered_keys(self):
        """Acceptance: full ADMIN (allowed_modules NULL) retains full effective access."""
        u = MagicMock()
        u.role = 'ADMIN'
        u.allowed_modules = None
        for key in TENANT_MODULE_KEYS:
            self.assertTrue(
                tenant_dashboard_actor_has_module(u, key),
                f'ADMIN with null allowed_modules should pass module {key!r}',
            )

    def test_tenant_dashboard_actor_staff(self):
        u = MagicMock()
        u.role = 'STAFF'
        u.allowed_modules = ['students']
        self.assertTrue(tenant_dashboard_actor_has_module(u, 'students'))
        self.assertFalse(tenant_dashboard_actor_has_module(u, 'users'))

    def test_has_full_tenant_dashboard_module_access(self):
        owner = MagicMock(role='OWNER', allowed_modules=None)
        self.assertTrue(has_full_tenant_dashboard_module_access(owner))
        admin_full = MagicMock(role='ADMIN', allowed_modules=None)
        self.assertTrue(has_full_tenant_dashboard_module_access(admin_full))
        admin_list = MagicMock(role='ADMIN', allowed_modules=['students'])
        self.assertFalse(has_full_tenant_dashboard_module_access(admin_list))
        staff = MagicMock(role='STAFF', allowed_modules=['students'])
        self.assertFalse(has_full_tenant_dashboard_module_access(staff))

    def test_user_has_tenant_module_alias(self):
        u = MagicMock()
        u.role = 'STAFF'
        u.allowed_modules = ['classes']
        self.assertTrue(user_has_tenant_module(u, 'classes'))
        self.assertFalse(user_has_tenant_module(u, ''))
        self.assertFalse(user_has_tenant_module(u, 'invoices'))

    def test_is_tenant_admin_staff_blocked_without_module_on_view(self):
        user = User.objects.create_user(
            email='s3@example.com',
            role=User.Role.STAFF,
            academy=self.academy,
            allowed_modules=['students'],
        )
        request = self.factory.get('/api/v1/tenant/locations/')
        request.user = user
        request.academy = self.academy
        view = MagicMock(required_tenant_module='locations')
        self.assertFalse(IsTenantAdmin().has_permission(request, view))

    def test_is_tenant_admin_staff_allowed_with_module(self):
        user = User.objects.create_user(
            email='s4@example.com',
            role=User.Role.STAFF,
            academy=self.academy,
            allowed_modules=['locations'],
        )
        request = self.factory.get('/api/v1/tenant/locations/')
        request.user = user
        request.academy = self.academy
        view = MagicMock(required_tenant_module='locations')
        self.assertTrue(IsTenantAdmin().has_permission(request, view))
