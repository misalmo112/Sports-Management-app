from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from saas_platform.quotas.models import TenantQuota, TenantUsage
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from saas_platform.tenants.models import Academy
from shared.services.quota import QuotaExceededError, check_quota_before_create
from tenant.classes.models import Class

from django.core.files.uploadedfile import SimpleUploadedFile

User = get_user_model()


class SoftWarningsQuotaTests(APITestCase):
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Soft-Warning Academy",
            slug="soft-warning-academy",
            email="soft-warning@example.com",
            timezone="UTC",
            currency="USD",
            onboarding_completed=True,
            is_active=True,
        )

        self.plan = Plan.objects.create(
            name="Soft-Warning Plan",
            slug="soft-warning-plan",
            limits_json={
                "storage_bytes": 1000,
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

        self.usage, _ = TenantUsage.objects.get_or_create(
            academy=self.academy,
            defaults={
                "storage_used_bytes": 0,
                "students_count": 0,
                "coaches_count": 0,
                "admins_count": 0,
                "classes_count": 0,
            },
        )
        self.usage.storage_used_bytes = 0
        self.usage.save(update_fields=["storage_used_bytes"])

        self.quota, _ = TenantQuota.objects.get_or_create(
            academy=self.academy,
            defaults={
                "storage_bytes_limit": 0,
                "storage_warning_threshold_pct": 80,
                "max_students": 0,
                "max_coaches": 0,
                "max_admins": 0,
                "max_classes": 0,
            },
        )
        self.quota.storage_warning_threshold_pct = 80
        self.quota.save(update_fields=["storage_warning_threshold_pct"])

        self.test_class = Class.objects.create(
            academy=self.academy,
            name="Test Class",
            max_capacity=20,
        )

        self.admin = User.objects.create_user(
            email="admin-soft-warning@example.com",
            password="testpass123",
            role=User.Role.ADMIN,
            academy=self.academy,
            is_active=True,
            is_verified=True,
        )

    # ---- Model computation tests (T1–T7) ----
    def test_T1_unlimited_storage_status_when_limit_zero(self):
        self.quota.storage_bytes_limit = 0
        self.quota.save(update_fields=["storage_bytes_limit"])

        self.usage.storage_used_bytes = 123
        self.usage.save(update_fields=["storage_used_bytes"])

        self.assertEqual(self.usage.get_storage_status(self.quota), "unlimited")
        self.assertEqual(self.usage.get_storage_usage_pct(self.quota), 0.0)

    def test_T2_storage_usage_pct_rounds_to_two_decimals(self):
        self.quota.storage_bytes_limit = 3
        self.quota.save(update_fields=["storage_bytes_limit"])

        self.usage.storage_used_bytes = 1
        self.usage.save(update_fields=["storage_used_bytes"])

        # 1/3*100 = 33.333..., rounded to 33.33
        self.assertEqual(self.usage.get_storage_usage_pct(self.quota), 33.33)

    def test_T3_storage_status_ok_below_warning_threshold(self):
        self.quota.storage_bytes_limit = 1000
        self.quota.storage_warning_threshold_pct = 80
        self.quota.save(update_fields=["storage_bytes_limit", "storage_warning_threshold_pct"])

        self.usage.storage_used_bytes = 799  # 79.9%
        self.usage.save(update_fields=["storage_used_bytes"])

        self.assertEqual(self.usage.get_storage_status(self.quota), "ok")

    def test_T4_storage_status_warning_inclusive_at_threshold(self):
        self.quota.storage_bytes_limit = 1000
        self.quota.storage_warning_threshold_pct = 80
        self.quota.save(update_fields=["storage_bytes_limit", "storage_warning_threshold_pct"])

        self.usage.storage_used_bytes = 800  # exactly 80.0%
        self.usage.save(update_fields=["storage_used_bytes"])

        self.assertEqual(self.usage.get_storage_status(self.quota), "warning")

    def test_T5_storage_status_exceeded_inclusive_at_100_percent(self):
        self.quota.storage_bytes_limit = 1000
        self.quota.storage_warning_threshold_pct = 80
        self.quota.save(update_fields=["storage_bytes_limit", "storage_warning_threshold_pct"])

        self.usage.storage_used_bytes = 1000  # exactly 100.0%
        self.usage.save(update_fields=["storage_used_bytes"])

        self.assertEqual(self.usage.get_storage_status(self.quota), "exceeded")

    def test_T6_check_quota_before_create_returns_storage_status_warning_when_threshold_crossed(self):
        self.usage.storage_used_bytes = 800  # 80.0%
        self.usage.save(update_fields=["storage_used_bytes"])

        allowed, current_usage, limit, storage_status = check_quota_before_create(
            academy=self.academy,
            quota_type="storage_bytes",
            requested_increment=10,  # 810 <= 1000
        )

        self.assertTrue(allowed)
        self.assertEqual(current_usage, 800)
        self.assertEqual(limit, 1000)
        self.assertEqual(storage_status, "warning")

    def test_T7_check_quota_before_create_returns_storage_status_ok_when_below_threshold(self):
        self.usage.storage_used_bytes = 799  # 79.9%
        self.usage.save(update_fields=["storage_used_bytes"])

        allowed, current_usage, limit, storage_status = check_quota_before_create(
            academy=self.academy,
            quota_type="storage_bytes",
            requested_increment=10,  # 809 <= 1000
        )

        self.assertTrue(allowed)
        self.assertEqual(current_usage, 799)
        self.assertEqual(limit, 1000)
        self.assertEqual(storage_status, "ok")

    # ---- API integration tests (T8–T11) ----
    @patch("tenant.media.services.default_storage")
    def test_T8_media_upload_sets_warning_headers_when_current_pct_reaches_threshold(self, mock_storage):
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

        # current_pct = 80.00% (warning)
        self.usage.storage_used_bytes = 800
        self.usage.save(update_fields=["storage_used_bytes"])

        mock_storage.save.return_value = f"{self.academy.id}/2024/01/test-uuid-warning.jpg"
        mock_storage.size.return_value = 10
        mock_storage.url.return_value = "https://example.com/mock-url"

        uploaded = SimpleUploadedFile(
            "warn.jpg",
            b"x" * 10,
            content_type="image/jpeg",
        )

        response = self.client.post(
            "/api/v1/tenant/media/",
            {
                "file": uploaded,
                "class_id": self.test_class.id,
                "description": "desc",
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response["X-Storage-Status"], "warning")
        self.assertEqual(response["X-Storage-Usage-Pct"], "80.00")
        self.assertIn("warning threshold", response["X-Storage-Warning"].lower())
        self.assertIn("80.00%", response["X-Storage-Warning"])

    @patch("tenant.media.services.default_storage")
    def test_T9_media_upload_hard_blocks_when_new_usage_exceeds_limit_and_does_not_call_upload(self, mock_storage):
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

        self.usage.storage_used_bytes = 990
        self.usage.save(update_fields=["storage_used_bytes"])

        uploaded = SimpleUploadedFile(
            "exceeded.jpg",
            b"x" * 20,  # requested_increment=20 => new_usage=1010 > 1000
            content_type="image/jpeg",
        )

        with patch("tenant.media.views.MediaService.upload_file") as upload_mock:
            response = self.client.post(
                "/api/v1/tenant/media/",
                {
                    "file": uploaded,
                    "class_id": self.test_class.id,
                    "description": "desc",
                },
                format="multipart",
            )

            upload_mock.assert_not_called()

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"], "Storage quota exceeded.")
        self.assertEqual(response.data["quota_type"], "storage_bytes")
        self.assertEqual(response.data["current_usage"], 990)
        self.assertEqual(response.data["limit"], 1000)
        self.assertEqual(response.data["requested"], 20)
        self.assertEqual(response.data["storage_status"], "exceeded")
        self.assertIsNone(response.headers.get("X-Storage-Status"))

    def test_T10_platform_quota_update_persists_storage_warning_threshold_and_includes_it_in_get(self):
        superadmin = User.objects.create_superuser(
            email="superadmin-soft-warning@example.com",
            password="testpass123",
            role=User.Role.ADMIN,
            is_active=True,
        )

        # Switch auth to platform admin.
        self.client.force_authenticate(user=superadmin)

        patch_resp = self.client.patch(
            f"/api/v1/platform/academies/{self.academy.id}/quota/",
            {"overrides_json": {"storage_warning_threshold_pct": 50}},
            format="json",
        )

        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data["storage_warning_threshold_pct"], 50)

        get_resp = self.client.get(f"/api/v1/platform/academies/{self.academy.id}/")
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(get_resp.data["usage"]["storage_warning_threshold_pct"], 50)

    def test_T11_platform_academy_detail_usage_includes_storage_fields(self):
        superadmin = User.objects.create_superuser(
            email="superadmin-soft-warning2@example.com",
            password="testpass123",
            role=User.Role.ADMIN,
            is_active=True,
        )

        self.client.force_authenticate(user=superadmin)

        # Ensure some deterministic storage usage.
        self.usage.storage_used_bytes = 800
        self.usage.save(update_fields=["storage_used_bytes"])

        get_resp = self.client.get(f"/api/v1/platform/academies/{self.academy.id}/")
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)

        usage = get_resp.data["usage"]
        self.assertIn("storage_status", usage)
        self.assertIn("storage_usage_pct", usage)
        self.assertIn("storage_warning_threshold_pct", usage)

        self.assertEqual(usage["storage_status"], "warning")
        self.assertEqual(usage["storage_warning_threshold_pct"], 80)
        # 800/1000*100 = 80.00
        self.assertEqual(usage["storage_usage_pct"], 80.0)

