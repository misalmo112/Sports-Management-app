from django.conf import settings as django_settings
from django.test import SimpleTestCase

from saas_platform.masters.tasks import (
    sync_currencies_and_rates_from_frankfurter_task,
    sync_timezones_from_worldtimeapi_task,
)


class MastersTaskConfigTest(SimpleTestCase):
    def test_global_celery_result_settings_defaults(self):
        self.assertTrue(django_settings.CELERY_TASK_IGNORE_RESULT)
        self.assertEqual(django_settings.CELERY_RESULT_EXPIRES, 3600)

    def test_frankfurter_sync_task_has_retry_policy_and_ignores_result(self):
        self.assertTrue(sync_currencies_and_rates_from_frankfurter_task.ignore_result)
        self.assertIn(Exception, sync_currencies_and_rates_from_frankfurter_task.autoretry_for)
        self.assertEqual(
            sync_currencies_and_rates_from_frankfurter_task.retry_kwargs.get("max_retries"),
            3,
        )

    def test_worldtimeapi_sync_task_has_retry_policy_and_ignores_result(self):
        self.assertTrue(sync_timezones_from_worldtimeapi_task.ignore_result)
        self.assertIn(Exception, sync_timezones_from_worldtimeapi_task.autoretry_for)
        self.assertEqual(sync_timezones_from_worldtimeapi_task.retry_kwargs.get("max_retries"), 3)
