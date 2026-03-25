from __future__ import annotations

import threading

from django.db import close_old_connections, connection, transaction
from django.test import TransactionTestCase, override_settings
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from django.db.models import Sum

from saas_platform.tenants.models import Academy
from saas_platform.quotas.models import TenantUsage
from saas_platform.quotas.tasks import reconcile_all_storage

from tenant.media.models import MediaFile
from tenant.academy.serializers import AcademyUsageSummarySerializer
from saas_platform.tenants.serializers import AcademySerializer


def _create_media(*, academy: Academy, file_size: int, file_name: str = "file.jpg") -> MediaFile:
    return MediaFile.objects.create(
        academy=academy,
        file_name=file_name,
        file_path=f"tmp/{file_name}",
        file_size=file_size,
        mime_type="image/jpeg",
        description="",
        is_active=True,
        capture_date=None,
    )


class SignalCounterRecomputeTests(TransactionTestCase):
    """
    Phase S.1: TenantUsage.storage_used_bytes must stay accurate.
    These tests validate the MediaFile post_save/post_delete signals and the
    reconcile-all Celery safety net.
    """

    reset_sequences = True

    def setUp(self):
        self.academy = Academy.objects.create(
            name="SignalCounter Academy",
            slug="signal-counter-academy",
            email="signal-counter@example.com",
            timezone="UTC",
            currency="USD",
            is_active=True,
            onboarding_completed=True,
        )
        TenantUsage.objects.create(
            academy=self.academy,
            storage_used_bytes=0,
            students_count=0,
            coaches_count=0,
            admins_count=0,
            classes_count=0,
            counts_computed_at=timezone.now(),
        )

    def _sum_active_media(self) -> int:
        return (
            MediaFile.objects.filter(academy=self.academy, is_active=True).aggregate(total=Sum("file_size")).get("total")
            or 0
        )

    def _get_usage_storage(self) -> int:
        return TenantUsage.objects.get(academy=self.academy).storage_used_bytes

    def test_T1_post_save_recomputes_storage_used_bytes(self):
        # Initial: 0
        self.assertEqual(self._get_usage_storage(), 0)

        _create_media(academy=self.academy, file_size=1024, file_name="a1.jpg")

        self.assertEqual(self._sum_active_media(), 1024)
        self.assertEqual(self._get_usage_storage(), 1024)

    def test_T2_soft_delete_is_active_flip_decrements_storage_used_bytes(self):
        m1 = _create_media(academy=self.academy, file_size=500, file_name="a1.jpg")
        m2 = _create_media(academy=self.academy, file_size=800, file_name="a2.jpg")
        self.assertEqual(self._get_usage_storage(), 1300)

        m1.is_active = False
        m1.save(update_fields=["is_active", "updated_at"])

        self.assertEqual(self._sum_active_media(), 800)
        self.assertEqual(self._get_usage_storage(), 800)

    def test_T3_post_delete_recomputes_storage_used_bytes(self):
        _create_media(academy=self.academy, file_size=300, file_name="a1.jpg")
        m2 = _create_media(academy=self.academy, file_size=400, file_name="a2.jpg")
        self.assertEqual(self._get_usage_storage(), 700)

        m2.delete()

        self.assertEqual(self._sum_active_media(), 300)
        self.assertEqual(self._get_usage_storage(), 300)

    def test_T4_reactivation_sets_storage_used_bytes_accurately(self):
        inactive = MediaFile.objects.create(
            academy=self.academy,
            file_name="inactive.jpg",
            file_path="tmp/inactive.jpg",
            file_size=200,
            mime_type="image/jpeg",
            description="",
            is_active=False,
            capture_date=None,
        )

        _ = inactive  # explicit: signal may have run; we still want a clean baseline.
        self.assertEqual(self._sum_active_media(), 0)

        active = _create_media(academy=self.academy, file_size=700, file_name="active.jpg")
        self.assertEqual(self._get_usage_storage(), 700)

        inactive.is_active = True
        inactive.save(update_fields=["is_active", "updated_at"])

        self.assertEqual(self._sum_active_media(), 900)
        self.assertEqual(self._get_usage_storage(), 900)

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_T5_reconcile_all_storage_corrects_drift(self):
        _create_media(academy=self.academy, file_size=600, file_name="a1.jpg")
        _create_media(academy=self.academy, file_size=700, file_name="a2.jpg")
        self.assertEqual(self._get_usage_storage(), 1300)

        # Introduce drift manually.
        TenantUsage.objects.filter(academy=self.academy).update(storage_used_bytes=1)
        self.academy.refresh_from_db()
        self.assertNotEqual(self._get_usage_storage(), 1300)

        # Run task synchronously to avoid broker/eager config flakiness.
        reconcile_all_storage.apply().get()

        self.assertEqual(self._get_usage_storage(), 1300)

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_T6_serializers_get_usage_do_not_update_tenant_usage(self):
        _create_media(academy=self.academy, file_size=1024, file_name="a1.jpg")
        self.assertEqual(self._sum_active_media(), 1024)

        # Drift the persisted counter.
        TenantUsage.objects.filter(academy=self.academy).update(storage_used_bytes=999999)

        from unittest.mock import patch

        with patch(
            "saas_platform.analytics.services.StatsService.get_academy_db_size_bytes",
            return_value=0,
        ):
            with CaptureQueriesContext(connection) as ctx:
                tenant_payload = AcademyUsageSummarySerializer().get_usage(self.academy)

            with CaptureQueriesContext(connection) as ctx2:
                platform_payload = AcademySerializer().get_usage(self.academy)

        def _had_update(queries):
            def _is_sql_update(q: dict) -> bool:
                sql = (q.get("sql") or "").strip().lower()
                # Only treat as a violating query if it's an actual UPDATE statement.
                # (Avoid false positives from column names like `updated_at`.)
                return sql.startswith("update ")

            return any(_is_sql_update(q) for q in queries.captured_queries)

        self.assertFalse(_had_update(ctx))
        self.assertFalse(_had_update(ctx2))

        # Computed storage comes from live active MediaFile rows, not from the drifted column.
        self.assertEqual(tenant_payload["storage_used_bytes"], 1024)
        self.assertEqual(platform_payload["storage_used_bytes"], 1024)

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_T7_concurrent_creates_can_drift_then_reconcile_task_fixes(self):
        """
        Concurrency model:
        - Simulate two rapid uploads back-to-back (the “rapid succession” requirement).
        - Intentionally corrupt the persisted TenantUsage counter to emulate drift.
        - The reconcile-all task must then correct it.
        """
        self._run_rapid_succession_drift_then_reconcile_test()

    def _run_rapid_succession_drift_then_reconcile_test(self):
        # Two uploads created back-to-back (signals update TenantUsage).
        _create_media(academy=self.academy, file_size=100, file_name="rapid-a.jpg")
        _create_media(academy=self.academy, file_size=200, file_name="rapid-b.jpg")

        expected_total = 300
        self.assertEqual(self._get_usage_storage(), expected_total)

        # Emulate drift (e.g. direct DB edits / missed signal execution).
        TenantUsage.objects.filter(academy=self.academy).update(storage_used_bytes=0)
        self.academy.refresh_from_db()
        self.assertNotEqual(self._get_usage_storage(), expected_total)

        # Reconcile (task should run eagerly in this test suite via override_settings).
        reconcile_all_storage.apply().get()

        self.assertEqual(self._get_usage_storage(), expected_total)

