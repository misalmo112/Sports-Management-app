from django.core.cache import cache
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from django.db import connection
from django.utils import timezone

from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from saas_platform.quotas.models import TenantUsage
from tenant.students.models import Student
from tenant.coaches.models import Coach
from tenant.classes.models import Class
from tenant.users.models import User

from shared.cache_keys import build_count_usage_cache_key
import shared.cache_keys as cache_keys_module
from shared.services.quota import _get_count_usage, check_quota_before_create


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "quota-cache-signals-integration-tests",
        }
    }
)
class QuotaCacheSignalsIntegrationTests(TestCase):
    def setUp(self):
        # Ensure quota cache ops aren't disabled by earlier tests (Redis unavailability).
        cache.clear()
        cache_keys_module._CACHE_BACKEND_UNAVAILABLE = False

        self.academy = Academy.objects.create(
            name="QuotaCacheSignals Academy",
            slug="quota-cache-signals-academy",
            email="quota-cache-signals@example.com",
        )
        self.plan = Plan.objects.create(
            name="QuotaCacheSignals Plan",
            slug="quota-cache-signals-plan",
            limits_json={
                "storage_bytes": 1024,
                "max_students": 100,
                "max_coaches": 100,
                "max_admins": 100,
                "max_classes": 100,
            },
        )
        self.subscription = Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now(),
        )
        TenantUsage.objects.create(
            academy=self.academy,
            storage_used_bytes=0,
            students_count=0,
            coaches_count=0,
            admins_count=0,
            classes_count=0,
        )

    def _count_key(self, quota_type: str) -> str:
        return build_count_usage_cache_key(self.academy.id, quota_type)

    def _assert_second_read_has_zero_queries(self, quota_type: str):
        with CaptureQueriesContext(connection) as first_ctx:
            first_value = _get_count_usage(self.academy, quota_type)
        with self.assertNumQueries(0):
            second_value = _get_count_usage(self.academy, quota_type)

        self.assertEqual(first_value, second_value)
        self.assertGreater(len(first_ctx), 0)
        return first_value

    def test_student_create_soft_delete_reactivation_and_hard_delete_invalidate_count_cache(self):
        cache_key = self._count_key("students")
        cache.set(cache_key, 999, timeout=300)
        self.assertEqual(cache.get(cache_key), 999)

        student = Student.objects.create(
            academy=self.academy,
            first_name="S",
            last_name="One",
            is_active=True,
        )

        # Create invalidation
        self.assertIsNone(cache.get(cache_key))

        # TTL-cache behavior: second read uses cache (0 DB queries).
        self._assert_second_read_has_zero_queries("students")

        # Soft delete invalidation (pre_save when is_active flips).
        student.is_active = False
        student.save(update_fields=["is_active", "updated_at"])
        self.assertIsNone(cache.get(cache_key))

        with CaptureQueriesContext(connection) as ctx1:
            current = _get_count_usage(self.academy, "students")
        self.assertEqual(current, 0)
        self.assertGreater(len(ctx1), 0)
        with CaptureQueriesContext(connection) as ctx2:
            current2 = _get_count_usage(self.academy, "students")
        self.assertEqual(current2, 0)
        self.assertEqual(len(ctx2), 0)

        # Reactivation invalidation
        student.is_active = True
        student.save(update_fields=["is_active", "updated_at"])
        self.assertIsNone(cache.get(cache_key))
        self._assert_second_read_has_zero_queries("students")

        # Hard delete invalidation (post_delete)
        student.delete()
        self.assertIsNone(cache.get(cache_key))

        with CaptureQueriesContext(connection) as ctx3:
            current3 = _get_count_usage(self.academy, "students")
        self.assertEqual(current3, 0)
        self.assertGreater(len(ctx3), 0)
        with CaptureQueriesContext(connection) as ctx4:
            current4 = _get_count_usage(self.academy, "students")
        self.assertEqual(current4, 0)
        self.assertEqual(len(ctx4), 0)

    def test_coach_create_soft_delete_reactivation_and_hard_delete_invalidate_count_cache(self):
        cache_key = self._count_key("coaches")
        cache.set(cache_key, 999, timeout=300)
        self.assertEqual(cache.get(cache_key), 999)

        coach = Coach.objects.create(
            academy=self.academy,
            first_name="C",
            last_name="One",
            email="coach1@example.com",
            is_active=True,
        )
        self.assertIsNone(cache.get(cache_key))

        self._assert_second_read_has_zero_queries("coaches")

        coach.is_active = False
        coach.save(update_fields=["is_active", "updated_at"])
        self.assertIsNone(cache.get(cache_key))

        with CaptureQueriesContext(connection) as ctx1:
            current = _get_count_usage(self.academy, "coaches")
        self.assertEqual(current, 0)
        self.assertGreater(len(ctx1), 0)
        with CaptureQueriesContext(connection) as ctx2:
            current2 = _get_count_usage(self.academy, "coaches")
        self.assertEqual(current2, 0)
        self.assertEqual(len(ctx2), 0)

        coach.is_active = True
        coach.save(update_fields=["is_active", "updated_at"])
        self.assertIsNone(cache.get(cache_key))
        self._assert_second_read_has_zero_queries("coaches")

        coach.delete()
        self.assertIsNone(cache.get(cache_key))

        with CaptureQueriesContext(connection) as ctx3:
            current3 = _get_count_usage(self.academy, "coaches")
        self.assertEqual(current3, 0)
        self.assertGreater(len(ctx3), 0)
        with CaptureQueriesContext(connection) as ctx4:
            current4 = _get_count_usage(self.academy, "coaches")
        self.assertEqual(current4, 0)
        self.assertEqual(len(ctx4), 0)

    def test_class_create_soft_delete_reactivation_and_hard_delete_invalidate_count_cache(self):
        cache_key = self._count_key("classes")
        cache.set(cache_key, 999, timeout=300)
        self.assertEqual(cache.get(cache_key), 999)

        class_obj = Class.objects.create(
            academy=self.academy,
            name="Class A",
            is_active=True,
            max_capacity=20,
        )
        self.assertIsNone(cache.get(cache_key))

        self._assert_second_read_has_zero_queries("classes")

        class_obj.is_active = False
        class_obj.save(update_fields=["is_active", "updated_at"])
        self.assertIsNone(cache.get(cache_key))

        with CaptureQueriesContext(connection) as ctx1:
            current = _get_count_usage(self.academy, "classes")
        self.assertEqual(current, 0)
        self.assertGreater(len(ctx1), 0)
        with CaptureQueriesContext(connection) as ctx2:
            current2 = _get_count_usage(self.academy, "classes")
        self.assertEqual(current2, 0)
        self.assertEqual(len(ctx2), 0)

        class_obj.is_active = True
        class_obj.save(update_fields=["is_active", "updated_at"])
        self.assertIsNone(cache.get(cache_key))
        self._assert_second_read_has_zero_queries("classes")

        class_obj.delete()
        self.assertIsNone(cache.get(cache_key))

        with CaptureQueriesContext(connection) as ctx3:
            current3 = _get_count_usage(self.academy, "classes")
        self.assertEqual(current3, 0)
        self.assertGreater(len(ctx3), 0)
        with CaptureQueriesContext(connection) as ctx4:
            current4 = _get_count_usage(self.academy, "classes")
        self.assertEqual(current4, 0)
        self.assertEqual(len(ctx4), 0)

    def test_user_create_soft_delete_reactivation_and_hard_delete_invalidate_admin_count_cache(self):
        cache_key = self._count_key("admins")
        cache.set(cache_key, 999, timeout=300)
        self.assertEqual(cache.get(cache_key), 999)

        user = User.objects.create_user(
            email="admin1@example.com",
            password="strong-pass-123",
            academy=self.academy,
            role=User.Role.ADMIN,
            is_active=True,
        )
        self.assertIsNone(cache.get(cache_key))

        self._assert_second_read_has_zero_queries("admins")

        user.is_active = False
        user.save()
        self.assertIsNone(cache.get(cache_key))

        with CaptureQueriesContext(connection) as ctx1:
            current = _get_count_usage(self.academy, "admins")
        self.assertEqual(current, 0)
        self.assertGreater(len(ctx1), 0)
        with CaptureQueriesContext(connection) as ctx2:
            current2 = _get_count_usage(self.academy, "admins")
        self.assertEqual(current2, 0)
        self.assertEqual(len(ctx2), 0)

        user.is_active = True
        user.save()
        self.assertIsNone(cache.get(cache_key))
        self._assert_second_read_has_zero_queries("admins")

        user.delete()
        self.assertIsNone(cache.get(cache_key))

        with CaptureQueriesContext(connection) as ctx3:
            current3 = _get_count_usage(self.academy, "admins")
        self.assertEqual(current3, 0)
        self.assertGreater(len(ctx3), 0)
        with CaptureQueriesContext(connection) as ctx4:
            current4 = _get_count_usage(self.academy, "admins")
        self.assertEqual(current4, 0)
        self.assertEqual(len(ctx4), 0)

    def test_user_role_to_from_admin_invalidates_admin_count_cache(self):
        cache_key = self._count_key("admins")

        user = User.objects.create_user(
            email="parent1@example.com",
            password="strong-pass-123",
            academy=self.academy,
            role=User.Role.PARENT,
            is_active=True,
        )

        # Prime cache with initial admins=0.
        with CaptureQueriesContext(connection) as ctx1:
            initial = _get_count_usage(self.academy, "admins")
        self.assertEqual(initial, 0)
        self.assertGreater(len(ctx1), 0)

        with self.assertNumQueries(0):
            initial2 = _get_count_usage(self.academy, "admins")
        self.assertEqual(initial2, 0)
        self.assertEqual(cache.get(cache_key), 0)

        # PARENT -> ADMIN invalidation
        user.role = User.Role.ADMIN
        user.save(update_fields=["role", "updated_at"])
        self.assertIsNone(cache.get(cache_key))

        with CaptureQueriesContext(connection) as ctx3:
            after_to_admin = _get_count_usage(self.academy, "admins")
        self.assertEqual(after_to_admin, 1)
        self.assertGreater(len(ctx3), 0)
        with self.assertNumQueries(0):
            after_to_admin_2 = _get_count_usage(self.academy, "admins")
        self.assertEqual(after_to_admin_2, 1)

        # ADMIN -> COACH invalidation
        user.role = User.Role.COACH
        user.save(update_fields=["role", "updated_at"])
        self.assertIsNone(cache.get(cache_key))

        with CaptureQueriesContext(connection) as ctx4:
            after_from_admin = _get_count_usage(self.academy, "admins")
        self.assertEqual(after_from_admin, 0)
        self.assertGreater(len(ctx4), 0)
        with self.assertNumQueries(0):
            after_from_admin_2 = _get_count_usage(self.academy, "admins")
        self.assertEqual(after_from_admin_2, 0)

    def test_storage_used_bytes_never_cached(self):
        # Ensure count usage keys are not present before storage quota checks.
        for quota_type in ("students", "coaches", "classes", "admins"):
            cache.delete(self._count_key(quota_type))
            self.assertIsNone(cache.get(self._count_key(quota_type)))

        # storage_bytes must be read from DB (TenantUsage), not derived from any cache.
        TenantUsage.objects.filter(academy=self.academy).update(storage_used_bytes=100)

        with CaptureQueriesContext(connection) as storage_ctx:
            allowed, current_usage, limit, _storage_status = check_quota_before_create(
                self.academy,
                quota_type="storage_bytes",
                requested_increment=1,
            )

        self.assertTrue(allowed)
        self.assertEqual(current_usage, 100)
        self.assertGreater(limit, 0)
        self.assertGreater(len(storage_ctx), 0)
        self.assertTrue(
            any(
                "tenant_usages" in q.get("sql", "").lower()
                for q in getattr(storage_ctx, "captured_queries", []) or []
            ),
            "Expected TenantUsage DB query during storage quota check.",
        )

        # Storage used bytes should not be written to any quota usage cache key.
        for quota_type in ("students", "coaches", "classes", "admins"):
            self.assertIsNone(cache.get(self._count_key(quota_type)))

