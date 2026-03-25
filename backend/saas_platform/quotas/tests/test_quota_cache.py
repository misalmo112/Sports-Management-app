from django.core.cache import cache
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from django.db import connection
from django.utils import timezone

from saas_platform.quotas.services import QuotaService
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from saas_platform.tenants.models import Academy
from shared.cache_keys import (
    build_count_usage_cache_key,
    build_effective_quota_cache_key,
)
from shared.services.quota import _get_count_usage
from tenant.students.models import Student
from tenant.users.models import User


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "quota-cache-tests",
        }
    }
)
class QuotaCacheTest(TestCase):
    def setUp(self):
        cache.clear()
        self.academy = Academy.objects.create(
            name="Cache Academy",
            slug="cache-academy",
            email="cache@example.com",
        )
        self.plan = Plan.objects.create(
            name="Cache Plan",
            slug="cache-plan",
            limits_json={
                "storage_bytes": 1024,
                "max_students": 2,
                "max_coaches": 2,
                "max_admins": 2,
                "max_classes": 2,
            },
        )
        Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now(),
        )

    def test_calculate_effective_quota_uses_cache(self):
        cache_key = build_effective_quota_cache_key(self.academy.id)
        cache.delete(cache_key)

        with CaptureQueriesContext(connection) as first_ctx:
            first = QuotaService.calculate_effective_quota(self.academy)
        with CaptureQueriesContext(connection) as second_ctx:
            second = QuotaService.calculate_effective_quota(self.academy)

        self.assertEqual(first, second)
        self.assertGreater(len(first_ctx), 0)
        self.assertEqual(len(second_ctx), 0)

    def test_subscription_save_invalidates_effective_quota_cache(self):
        cache_key = build_effective_quota_cache_key(self.academy.id)
        initial = QuotaService.calculate_effective_quota(self.academy)
        self.assertEqual(initial["max_students"], 2)
        self.assertIsNotNone(cache.get(cache_key))

        subscription = Subscription.objects.get(academy=self.academy, is_current=True)
        subscription.overrides_json = {"max_students": 5}
        subscription.save(update_fields=["overrides_json", "updated_at"])

        updated = QuotaService.calculate_effective_quota(self.academy)
        self.assertEqual(updated["max_students"], 5)

    def test_count_usage_uses_cache(self):
        cache_key = build_count_usage_cache_key(self.academy.id, "students")
        cache.delete(cache_key)
        Student.objects.create(
            academy=self.academy,
            first_name="S",
            last_name="One",
            is_active=True,
        )

        with CaptureQueriesContext(connection) as first_ctx:
            first = _get_count_usage(self.academy, "students")
        with CaptureQueriesContext(connection) as second_ctx:
            second = _get_count_usage(self.academy, "students")

        self.assertEqual(first, 1)
        self.assertEqual(first, second)
        self.assertGreater(len(first_ctx), 0)
        self.assertEqual(len(second_ctx), 0)

    def test_student_signal_invalidates_count_cache(self):
        cache_key = build_count_usage_cache_key(self.academy.id, "students")
        cache.set(cache_key, 99, timeout=300)

        Student.objects.create(
            academy=self.academy,
            first_name="S",
            last_name="Two",
            is_active=True,
        )

        self.assertIsNone(cache.get(cache_key))

    def test_admin_user_signal_invalidates_admin_count_cache(self):
        cache_key = build_count_usage_cache_key(self.academy.id, "admins")
        cache.set(cache_key, 99, timeout=300)

        User.objects.create_user(
            email="admin1@example.com",
            password="strong-pass-123",
            academy=self.academy,
            role=User.Role.ADMIN,
            is_active=True,
        )

        self.assertIsNone(cache.get(cache_key))
