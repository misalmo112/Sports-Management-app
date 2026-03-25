import logging

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from django_celery_beat.models import CrontabSchedule, IntervalSchedule, PeriodicTask

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Seed django-celery-beat periodic tasks for scheduled operations."

    def _crontab_at(self, *, hour: int, minute: int) -> CrontabSchedule:
        tz = getattr(settings, "CELERY_TIMEZONE", "UTC")
        return CrontabSchedule.objects.get_or_create(
            minute=str(minute),
            hour=str(hour),
            day_of_week="*",
            day_of_month="*",
            month_of_year="*",
            timezone=tz,
        )[0]

    def _interval_every_seconds(self, *, seconds: int) -> IntervalSchedule:
        # django-celery-beat stores interval schedules by (every, period).
        return IntervalSchedule.objects.get_or_create(
            every=seconds,
            period=IntervalSchedule.SECONDS,
        )[0]

    @transaction.atomic
    def handle(self, *args, **options):
        """
        Seed exactly 5 periodic tasks (idempotent by PeriodicTask.name).

        Note: we delete any previously-created PeriodicTask entries that are not
        part of the expected Phase R.4 set, so that PeriodicTask count is deterministic.
        """

        tz = getattr(settings, "CELERY_TIMEZONE", "UTC")
        required = {
            "sync-frankfurter-daily": {
                "task": "saas_platform.masters.tasks.sync_currencies_and_rates_from_frankfurter_task",
                "interval_seconds": 86400,
                "expire_seconds": 3600,
            },
            "sync-worldtimeapi-weekly": {
                "task": "saas_platform.masters.tasks.sync_timezones_from_worldtimeapi_task",
                "interval_seconds": 604800,
                "expire_seconds": 3600,
            },
            "sync-payments-to-xero": {
                "task": "saas_platform.finance.tasks.sync_payments_to_xero",
                "interval_seconds": 900,
                "expire_seconds": 600,
            },
            "run-invoice-schedules": {
                "task": "tenant.billing.tasks.run_invoice_schedules",
                "crontab_hour": 0,
                "crontab_minute": 0,
            },
            "run-staff-pay-schedules": {
                "task": "tenant.coaches.tasks.run_staff_pay_schedules",
                "crontab_hour": 0,
                "crontab_minute": 30,
            },
        }

        try:
            # Keep DB clean and deterministic for repeated runs.
            PeriodicTask.objects.exclude(name__in=required.keys()).delete()

            for name, spec in required.items():
                task_path = spec["task"]
                defaults: dict[str, object] = {
                    "task": task_path,
                    "enabled": True,
                    "solar": None,
                    "clocked": None,
                }

                if "interval_seconds" in spec:
                    interval = self._interval_every_seconds(seconds=spec["interval_seconds"])
                    defaults.update(
                        {
                            "interval": interval,
                            "crontab": None,
                            "expire_seconds": spec["expire_seconds"],
                        }
                    )
                else:
                    crontab = self._crontab_at(
                        hour=spec["crontab_hour"],
                        minute=spec["crontab_minute"],
                    )
                    defaults.update(
                        {
                            "interval": None,
                            "crontab": crontab,
                        }
                    )

                PeriodicTask.objects.update_or_create(
                    name=name,
                    defaults=defaults,
                )

            _ = tz  # makes it explicit that we used settings CELERY_TIMEZONE for schedules
        except Exception:
            logger.exception("Failed seeding beat schedule (tz=%s)", tz)
            raise

        self.stdout.write(self.style.SUCCESS(f"Seeded django-celery-beat schedule ({len(required)} tasks)."))

