from unittest.mock import patch

from django.core.cache import cache
from django.db import connection
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext

from saas_platform.analytics.services import StatsService
from saas_platform.tenants.models import Academy
from tenant.media.models import MediaFile


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "db-size-bytes-cache-tests",
        }
    }
)
class DbSizeCacheTest(TestCase):
    def setUp(self) -> None:
        cache.clear()

        # StatsService.get_academy_db_sizes() is PostgreSQL-only for table sizes.
        # The repo test settings use SQLite, so we patch table-size discovery
        # to keep the allocation logic (and DB counting queries) exercised.
        self._table_sizes_patcher = patch.object(
            StatsService,
            "_get_table_sizes",
            return_value={"tenant_media_files": 1000},
        )
        self._table_sizes_patcher.start()

        self.academy = Academy.objects.create(
            name="Cache Academy (DB size)",
            slug="cache-academy-db-size",
            email="cache-db-size@example.com",
            is_active=True,
            onboarding_completed=True,
        )

        MediaFile.objects.create(
            academy=self.academy,
            file_name="file.dat",
            file_path="uploads/file.dat",
            file_size=123,
            mime_type="application/octet-stream",
            is_active=True,
        )

    def tearDown(self) -> None:
        self._table_sizes_patcher.stop()

    def test_t1_first_call_executes_queries_and_sets_cache(self):
        cache_key = f"db_size_bytes:{self.academy.id}"
        cache.delete(cache_key)

        with CaptureQueriesContext(connection) as first_ctx:
            value = StatsService.get_academy_db_size_bytes(self.academy.id)

        self.assertGreater(len(first_ctx), 0)
        self.assertIsNotNone(value)
        self.assertIsNotNone(cache.get(cache_key))
        self.assertEqual(cache.get(cache_key), value)

    def test_t2_second_call_within_ttl_executes_zero_queries(self):
        cache_key = f"db_size_bytes:{self.academy.id}"
        StatsService.get_academy_db_size_bytes(self.academy.id)
        self.assertIsNotNone(cache.get(cache_key))

        with CaptureQueriesContext(connection) as second_ctx:
            value = StatsService.get_academy_db_size_bytes(self.academy.id)

        self.assertEqual(len(second_ctx), 0)
        self.assertIsNotNone(value)

    def test_t3_delete_cache_key_forces_recompute(self):
        cache_key = f"db_size_bytes:{self.academy.id}"
        StatsService.get_academy_db_size_bytes(self.academy.id)
        cache.delete(cache_key)
        self.assertIsNone(cache.get(cache_key))

        with CaptureQueriesContext(connection) as third_ctx:
            value = StatsService.get_academy_db_size_bytes(self.academy.id)

        self.assertGreater(len(third_ctx), 0)
        self.assertIsNotNone(cache.get(cache_key))
        self.assertIsNotNone(value)

    def test_t4_single_value_matches_bulk_algorithm(self):
        cache_key = f"db_size_bytes:{self.academy.id}"
        cache.delete(cache_key)

        academy_sizes = StatsService.get_academy_db_sizes()
        expected = academy_sizes.get(self.academy.id, 0)

        actual = StatsService.get_academy_db_size_bytes(self.academy.id)
        self.assertEqual(actual, expected)

    def test_t5_bulk_warm_makes_single_call_cache_hit(self):
        cache_key = f"db_size_bytes:{self.academy.id}"
        cache.delete(cache_key)
        self.assertIsNone(cache.get(cache_key))

        StatsService.get_academy_db_sizes()
        self.assertIsNotNone(cache.get(cache_key))

        with CaptureQueriesContext(connection) as ctx:
            StatsService.get_academy_db_size_bytes(self.academy.id)

        self.assertEqual(len(ctx), 0)

    def test_t6_cache_key_format_exact(self):
        cache.delete(f"academy_db_size_bytes:{self.academy.id}")
        cache.delete(f"db_size_bytes:{self.academy.id}")

        value = StatsService.get_academy_db_size_bytes(self.academy.id)

        expected_key = f"db_size_bytes:{self.academy.id}"
        wrong_key = f"academy_db_size_bytes:{self.academy.id}"

        self.assertEqual(cache.get(expected_key), value)
        self.assertIsNone(cache.get(wrong_key))

