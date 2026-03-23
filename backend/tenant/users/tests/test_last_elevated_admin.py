"""
Regression tests: cannot deactivate or soft-delete the last active Owner/Admin for an academy.
"""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from django.utils import timezone

from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from saas_platform.audit.models import AuditAction, ResourceType
from shared.permissions.module_keys import TENANT_MODULE_KEYS

User = get_user_model()


class LastElevatedAdminTests(TestCase):
    """UserViewSet guards for the last login-capable OWNER/ADMIN."""

    def setUp(self):
        self.client = APIClient()
        self.academy = Academy.objects.create(
            name="Academy A",
            slug="academy-a",
            email="a@test.com",
            onboarding_completed=True,
        )
        self.plan = Plan.objects.create(
            name="Plan",
            slug="plan",
            limits_json={
                "max_students": 100,
                "max_coaches": 10,
                "max_admins": 5,
                "max_classes": 50,
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
            email="admin@academy.com",
            role=User.Role.ADMIN,
            academy=self.academy,
            is_active=True,
            is_verified=True,
        )
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

    def test_cannot_patch_deactivate_last_admin(self):
        url = f"/api/v1/admin/users/{self.admin.id}/"
        res = self.client.patch(url, {"is_active": False}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        details = res.data.get("details") or res.data
        self.assertIn("is_active", details)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    def test_cannot_soft_delete_last_admin(self):
        url = f"/api/v1/admin/users/{self.admin.id}/"
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        details = res.data.get("details") or res.data
        self.assertIn("detail", details)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    def test_can_deactivate_admin_when_another_elevated_exists(self):
        other = User.objects.create_user(
            email="other@academy.com",
            role=User.Role.ADMIN,
            academy=self.academy,
            is_active=True,
            is_verified=True,
        )
        url = f"/api/v1/admin/users/{other.id}/"
        res = self.client.patch(url, {"is_active": False}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        other.refresh_from_db()
        self.assertFalse(other.is_active)

    def test_owner_can_deactivate_admin_when_owner_remains(self):
        owner = User.objects.create_user(
            email="owner@academy.com",
            role=User.Role.OWNER,
            academy=self.academy,
            is_active=True,
            is_verified=True,
        )
        self.client.force_authenticate(user=owner)
        url = f"/api/v1/admin/users/{self.admin.id}/"
        res = self.client.patch(url, {"is_active": False}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.admin.refresh_from_db()
        self.assertFalse(self.admin.is_active)

    def test_superuser_can_soft_delete_last_elevated(self):
        superuser = User.objects.create_superuser(
            email="super@test.com",
            password="x",
            is_active=True,
        )
        self.client.force_authenticate(user=superuser)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        url = f"/api/v1/admin/users/{self.admin.id}/"
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.admin.refresh_from_db()
        self.assertFalse(self.admin.is_active)

    @patch("tenant.users.serializers.AuditService.log_action")
    def test_allowed_modules_change_writes_audit(self, mock_log):
        staff = User.objects.create_user(
            email="staff@academy.com",
            role=User.Role.STAFF,
            academy=self.academy,
            is_active=True,
            is_verified=True,
            allowed_modules=["attendance", "classes"],
        )
        keys = sorted([k for k in TENANT_MODULE_KEYS if k not in ("users", "academy-settings", "bulk-actions")])
        new_modules = keys[:3]
        url = f"/api/v1/admin/users/{staff.id}/"
        res = self.client.patch(
            url, {"allowed_modules": new_modules}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        mock_log.assert_called_once()
        kwargs = mock_log.call_args.kwargs
        self.assertEqual(kwargs["action"], AuditAction.UPDATE)
        self.assertEqual(kwargs["resource_type"], ResourceType.USER)
        self.assertEqual(kwargs["user"], None)
        self.assertEqual(kwargs["academy"], self.academy)
        changes = kwargs["changes_json"]
        self.assertEqual(changes["field"], "allowed_modules")
        self.assertEqual(changes["before"], ["attendance", "classes"])
        self.assertEqual(changes["after"], new_modules)
