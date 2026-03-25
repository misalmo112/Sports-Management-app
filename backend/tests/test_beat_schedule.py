from django.core.management import call_command
from django_celery_beat.models import PeriodicTask
from django.test import TestCase


class BeatSchedulePersistenceTest(TestCase):
    def _expected_periodic_tasks(self) -> dict[str, str]:
        # Phase R.3+R.4 expected names and Celery module paths.
        return {
            "sync-frankfurter-daily": "saas_platform.masters.tasks.sync_currencies_and_rates_from_frankfurter_task",
            "sync-worldtimeapi-weekly": "saas_platform.masters.tasks.sync_timezones_from_worldtimeapi_task",
            "run-invoice-schedules": "tenant.billing.tasks.run_invoice_schedules",
            "run-staff-pay-schedules": "tenant.coaches.tasks.run_staff_pay_schedules",
            "sync-payments-to-xero": "saas_platform.finance.tasks.sync_payments_to_xero",
        }

    def test_create_seeds_exactly_5_periodic_tasks(self):
        call_command("seed_beat_schedule", verbosity=0)
        self.assertEqual(PeriodicTask.objects.count(), 5)

    def test_idempotency_seed_does_not_create_duplicates(self):
        call_command("seed_beat_schedule", verbosity=0)
        call_command("seed_beat_schedule", verbosity=0)
        self.assertEqual(PeriodicTask.objects.count(), 5)

    def test_seed_sets_expected_names_module_paths_and_enabled(self):
        call_command("seed_beat_schedule", verbosity=0)

        expected = self._expected_periodic_tasks()
        actual_names = set(PeriodicTask.objects.values_list("name", flat=True))
        self.assertEqual(actual_names, set(expected.keys()))

        for name, expected_task_path in expected.items():
            pt = PeriodicTask.objects.get(name=name)
            self.assertTrue(pt.enabled)
            self.assertEqual(pt.task, expected_task_path)

