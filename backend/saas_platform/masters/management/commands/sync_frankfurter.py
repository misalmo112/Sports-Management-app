from django.core.management.base import BaseCommand

from saas_platform.masters.services import sync_currencies_and_rates_from_frankfurter


class Command(BaseCommand):
    help = "Sync currency list and latest exchange rates from Frankfurter API."

    def handle(self, *args, **options):
        self.stdout.write("Syncing currencies and rates from Frankfurter...")
        try:
            sync_currencies_and_rates_from_frankfurter()
            self.stdout.write(self.style.SUCCESS("Frankfurter sync completed."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Frankfurter sync failed: {e}"))
            raise
