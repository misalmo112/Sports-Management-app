from django.core.management.base import BaseCommand

from saas_platform.masters.services import sync_timezones_from_worldtimeapi


class Command(BaseCommand):
    help = "Sync timezone list from WorldTimeAPI (add new IANA zones)."

    def handle(self, *args, **options):
        self.stdout.write("Syncing timezones from WorldTimeAPI...")
        try:
            sync_timezones_from_worldtimeapi()
            self.stdout.write(self.style.SUCCESS("WorldTimeAPI sync completed."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"WorldTimeAPI sync failed: {e}"))
            raise
