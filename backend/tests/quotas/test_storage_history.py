import logging
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from saas_platform.quotas.models import StorageSnapshot, TenantQuota, TenantUsage
from saas_platform.quotas.services import QuotaService
from saas_platform.quotas.tasks import snapshot_all_storage
from saas_platform.tenants.models import Academy
from saas_platform.tenants.serializers import AcademySerializer as PlatformAcademySerializer
from tenant.academy.serializers import AcademyUsageSummarySerializer as TenantAcademyUsageSummarySerializer

User = get_user_model()


class StorageHistoryTests(APITestCase):
    def setUp(self):
        self.client = self.client  # explicit for readability

        self.user_academy = Academy.objects.create(
            name="User Academy",
            slug="user-academy",
            email="user-academy@example.com",
            is_active=True,
        )

        self.superadmin = User.objects.create_superuser(
            email="superadmin-storage-history@example.com",
            password="testpass123",
            role=User.Role.ADMIN,
            is_active=True,
        )
        self.admin = User.objects.create_user(
            email="admin-storage-history@example.com",
            password="testpass123",
            role=User.Role.ADMIN,
            academy=self.user_academy,
            is_active=True,
            is_superuser=False,
            is_staff=False,
        )

    # ---- T1–T4: task + endpoint ----
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_T1_snapshot_all_storage_creates_snapshots_only_for_active_academies(self):
        active_1 = Academy.objects.create(
            name="Active 1",
            slug="active-1",
            email="active-1@example.com",
            is_active=True,
        )
        active_2 = Academy.objects.create(
            name="Active 2",
            slug="active-2",
            email="active-2@example.com",
            is_active=True,
        )
        inactive = Academy.objects.create(
            name="Inactive",
            slug="inactive",
            email="inactive@example.com",
            is_active=False,
        )

        TenantUsage.objects.create(academy=active_1, storage_used_bytes=100)
        TenantUsage.objects.create(academy=active_2, storage_used_bytes=200)
        TenantUsage.objects.create(academy=inactive, storage_used_bytes=300)

        with patch(
            "saas_platform.quotas.tasks.StatsService.get_academy_db_size_bytes",
            return_value=0,
        ):
            snapshot_all_storage.apply().get()

        snapshots = StorageSnapshot.objects.all()
        self.assertEqual(snapshots.count(), 2)

        totals_by_academy = {
            str(s.academy_id): s.total_bytes
            for s in snapshots
        }
        self.assertEqual(totals_by_academy[str(active_1.id)], 100)
        self.assertEqual(totals_by_academy[str(active_2.id)], 200)
        self.assertNotIn(str(inactive.id), totals_by_academy)

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_T2_snapshot_all_storage_skips_academies_missing_tenant_usage_with_warning(self):
        active_with_usage = Academy.objects.create(
            name="Active with usage",
            slug="active-usage",
            email="active-usage@example.com",
            is_active=True,
        )
        active_missing_usage = Academy.objects.create(
            name="Active missing usage",
            slug="active-missing-usage",
            email="active-missing-usage@example.com",
            is_active=True,
        )

        TenantUsage.objects.create(academy=active_with_usage, storage_used_bytes=123)

        with patch(
            "saas_platform.quotas.tasks.StatsService.get_academy_db_size_bytes",
            return_value=0,
        ):
            with self.assertLogs("saas_platform.quotas.tasks", level="WARNING") as cm:
                snapshot_all_storage.apply().get()

        self.assertTrue(
            any("Missing TenantUsage" in msg for msg in cm.output),
            msg=f"Expected warning about missing TenantUsage. Logs: {cm.output}",
        )
        self.assertEqual(StorageSnapshot.objects.count(), 1)
        self.assertEqual(StorageSnapshot.objects.get().academy_id, active_with_usage.id)

    def test_T3_storage_history_permission_for_non_platform_admin_is_forbidden(self):
        academy = Academy.objects.create(
            name="Permission Academy",
            slug="perm-academy",
            email="perm-academy@example.com",
            is_active=True,
        )
        StorageSnapshot.objects.create(
            academy=academy,
            storage_used_bytes=1,
            db_size_bytes=0,
            total_bytes=1,
        )

        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(
            f"/api/v1/platform/academies/{academy.id}/storage-history/?days=30"
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_T4_storage_history_days_query_param_filters_snapshots_correctly(self):
        academy = Academy.objects.create(
            name="History Academy",
            slug="history-academy",
            email="history-academy@example.com",
            is_active=True,
        )

        now = timezone.now()
        included_1 = now - timedelta(days=5)
        included_2 = now - timedelta(days=29)
        excluded = now - timedelta(days=31)

        s1 = StorageSnapshot.objects.create(
            academy=academy,
            storage_used_bytes=1,
            db_size_bytes=0,
            total_bytes=1,
        )
        StorageSnapshot.objects.filter(pk=s1.pk).update(recorded_at=included_1)

        s2 = StorageSnapshot.objects.create(
            academy=academy,
            storage_used_bytes=2,
            db_size_bytes=0,
            total_bytes=2,
        )
        StorageSnapshot.objects.filter(pk=s2.pk).update(recorded_at=included_2)

        s3 = StorageSnapshot.objects.create(
            academy=academy,
            storage_used_bytes=3,
            db_size_bytes=0,
            total_bytes=3,
        )
        StorageSnapshot.objects.filter(pk=s3.pk).update(recorded_at=excluded)

        self.client.force_authenticate(user=self.superadmin)
        resp = self.client.get(
            f"/api/v1/platform/academies/{academy.id}/storage-history/?days=30"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["academy_id"], str(academy.id))
        self.assertEqual(resp.data["days"], 30)
        self.assertEqual(resp.data["count"], 2)
        self.assertEqual(len(resp.data["snapshots"]), 2)

    # ---- T5–T8: quota estimation ----
    def test_T5_estimate_days_to_quota_returns_none_when_fewer_than_two_snapshots(self):
        academy = Academy.objects.create(
            name="Estimate Academy (T5)",
            slug="estimate-t5",
            email="estimate-t5@example.com",
            is_active=True,
        )
        TenantQuota.objects.create(academy=academy, storage_bytes_limit=5 * 1024**3)

        StorageSnapshot.objects.create(
            academy=academy,
            storage_used_bytes=1 * 1024**3,
            db_size_bytes=0,
            total_bytes=1 * 1024**3,
        )

        self.assertIsNone(QuotaService.estimate_days_to_quota(academy))

    def test_T6_estimate_days_to_quota_returns_none_when_daily_growth_is_non_positive(self):
        academy = Academy.objects.create(
            name="Estimate Academy (T6)",
            slug="estimate-t6",
            email="estimate-t6@example.com",
            is_active=True,
        )
        TenantQuota.objects.create(academy=academy, storage_bytes_limit=5 * 1024**3)

        now = timezone.now()
        t_old = now - timedelta(days=14) + timedelta(seconds=5)
        t_new = now

        s_old = StorageSnapshot.objects.create(
            academy=academy,
            storage_used_bytes=2 * 1024**3,
            db_size_bytes=0,
            total_bytes=2 * 1024**3,
        )
        StorageSnapshot.objects.filter(pk=s_old.pk).update(recorded_at=t_old)

        s_new = StorageSnapshot.objects.create(
            academy=academy,
            storage_used_bytes=2 * 1024**3,
            db_size_bytes=0,
            total_bytes=2 * 1024**3,
        )
        StorageSnapshot.objects.filter(pk=s_new.pk).update(recorded_at=t_new)

        self.assertIsNone(QuotaService.estimate_days_to_quota(academy))

    def test_T7_estimate_days_to_quota_is_deterministic_for_1gb_to_2gb_over_14_days(self):
        academy = Academy.objects.create(
            name="Estimate Academy (T7)",
            slug="estimate-t7",
            email="estimate-t7@example.com",
            is_active=True,
        )
        quota_limit = 5 * 1024**3
        TenantQuota.objects.create(academy=academy, storage_bytes_limit=quota_limit)

        now = timezone.now()
        t_old = now - timedelta(days=14) + timedelta(seconds=5)
        t_new = now

        s_old = StorageSnapshot.objects.create(
            academy=academy,
            storage_used_bytes=1 * 1024**3,
            db_size_bytes=0,
            total_bytes=1 * 1024**3,
        )
        StorageSnapshot.objects.filter(pk=s_old.pk).update(recorded_at=t_old)

        s_new = StorageSnapshot.objects.create(
            academy=academy,
            storage_used_bytes=2 * 1024**3,
            db_size_bytes=0,
            total_bytes=2 * 1024**3,
        )
        StorageSnapshot.objects.filter(pk=s_new.pk).update(recorded_at=t_new)

        estimated = QuotaService.estimate_days_to_quota(academy, days_lookback=14)
        # From 1GB to 2GB over 14 days => +1GB / 14d => ~0.0714GB/day
        # Remaining to 5GB: 3GB => 3 / (1/14) = 42 days (allow +-1 day).
        self.assertIsNotNone(estimated)
        self.assertLessEqual(abs(estimated - 42), 1)

    def test_T8_estimate_days_to_quota_returns_zero_when_usage_reaches_or_exceeds_limit(self):
        academy = Academy.objects.create(
            name="Estimate Academy (T8)",
            slug="estimate-t8",
            email="estimate-t8@example.com",
            is_active=True,
        )
        quota_limit = 2 * 1024**3
        TenantQuota.objects.create(academy=academy, storage_bytes_limit=quota_limit)

        now = timezone.now()
        t_old = now - timedelta(days=14) + timedelta(seconds=5)
        t_new = now

        s_old = StorageSnapshot.objects.create(
            academy=academy,
            storage_used_bytes=1 * 1024**3,
            db_size_bytes=0,
            total_bytes=1 * 1024**3,
        )
        StorageSnapshot.objects.filter(pk=s_old.pk).update(recorded_at=t_old)

        s_new = StorageSnapshot.objects.create(
            academy=academy,
            storage_used_bytes=2 * 1024**3,
            db_size_bytes=0,
            total_bytes=2 * 1024**3,
        )
        StorageSnapshot.objects.filter(pk=s_new.pk).update(recorded_at=t_new)

        self.assertEqual(QuotaService.estimate_days_to_quota(academy, days_lookback=14), 0)

    # ---- T9–T11: response/serializer wiring ----
    def test_T9_storage_history_response_includes_expected_keys_and_snapshot_fields(self):
        academy = Academy.objects.create(
            name="History Academy (T9)",
            slug="history-t9",
            email="history-t9@example.com",
            is_active=True,
        )

        StorageSnapshot.objects.create(
            academy=academy,
            storage_used_bytes=10,
            db_size_bytes=0,
            total_bytes=10,
        )

        self.client.force_authenticate(user=self.superadmin)
        resp = self.client.get(
            f"/api/v1/platform/academies/{academy.id}/storage-history/?days=30"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["academy_id"], str(academy.id))
        self.assertIn("days", resp.data)
        self.assertIn("count", resp.data)
        self.assertIn("snapshots", resp.data)
        self.assertGreaterEqual(resp.data["count"], 1)
        self.assertGreaterEqual(len(resp.data["snapshots"]), 1)

        first = resp.data["snapshots"][0]
        self.assertIn("total_bytes", first)
        self.assertIn("recorded_at", first)

    def test_T10_platform_academy_usage_serializer_includes_days_to_quota(self):
        academy = Academy.objects.create(
            name="Usage Academy (Platform T10)",
            slug="usage-platform-t10",
            email="usage-platform-t10@example.com",
            is_active=True,
        )
        TenantQuota.objects.create(academy=academy, storage_bytes_limit=5 * 1024**3)

        now = timezone.now()
        t_old = now - timedelta(days=14) + timedelta(seconds=5)
        t_new = now

        s_old = StorageSnapshot.objects.create(
            academy=academy,
            storage_used_bytes=1 * 1024**3,
            db_size_bytes=0,
            total_bytes=1 * 1024**3,
        )
        StorageSnapshot.objects.filter(pk=s_old.pk).update(recorded_at=t_old)

        s_new = StorageSnapshot.objects.create(
            academy=academy,
            storage_used_bytes=2 * 1024**3,
            db_size_bytes=0,
            total_bytes=2 * 1024**3,
        )
        StorageSnapshot.objects.filter(pk=s_new.pk).update(recorded_at=t_new)

        payload = PlatformAcademySerializer().get_usage(academy)
        self.assertIn("days_to_quota", payload)
        self.assertIsNotNone(payload["days_to_quota"])
        self.assertLessEqual(abs(payload["days_to_quota"] - 42), 1)

    def test_T11_tenant_academy_usage_serializer_includes_days_to_quota(self):
        academy = Academy.objects.create(
            name="Usage Academy (Tenant T11)",
            slug="usage-tenant-t11",
            email="usage-tenant-t11@example.com",
            is_active=True,
        )
        TenantQuota.objects.create(academy=academy, storage_bytes_limit=5 * 1024**3)

        now = timezone.now()
        t_old = now - timedelta(days=14) + timedelta(seconds=5)
        t_new = now

        s_old = StorageSnapshot.objects.create(
            academy=academy,
            storage_used_bytes=1 * 1024**3,
            db_size_bytes=0,
            total_bytes=1 * 1024**3,
        )
        StorageSnapshot.objects.filter(pk=s_old.pk).update(recorded_at=t_old)

        s_new = StorageSnapshot.objects.create(
            academy=academy,
            storage_used_bytes=2 * 1024**3,
            db_size_bytes=0,
            total_bytes=2 * 1024**3,
        )
        StorageSnapshot.objects.filter(pk=s_new.pk).update(recorded_at=t_new)

        payload = TenantAcademyUsageSummarySerializer().get_usage(academy)
        self.assertIn("days_to_quota", payload)
        self.assertIsNotNone(payload["days_to_quota"])
        self.assertLessEqual(abs(payload["days_to_quota"] - 42), 1)

