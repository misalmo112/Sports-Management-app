"""
Run `tenant_migrate` for every academy whose Postgres schema exists.

`manage.py migrate` only updates the default (public) schema; tenant copies of
apps like `users` need `tenant_migrate` per academy after new migrations land.
"""
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connection
from saas_platform.tenants.models import Academy
from shared.tenancy.schema import build_schema_name, is_valid_schema_name


class Command(BaseCommand):
    help = "Run tenant_migrate for each academy that has a tenant schema in the database."

    def handle(self, *args, **options):
        if connection.vendor != 'postgresql':
            self.stdout.write("Skipping tenant_migrate_all (database is not PostgreSQL).")
            return

        verbosity = options["verbosity"]
        processed = 0
        for academy in Academy.objects.all().order_by("created_at"):
            schema_name = academy.schema_name or build_schema_name(academy.id)
            if not is_valid_schema_name(schema_name):
                continue
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM information_schema.schemata WHERE schema_name = %s",
                    [schema_name],
                )
                if cursor.fetchone() is None:
                    continue
            self.stdout.write(
                f"tenant_migrate academy_id={academy.id} schema={schema_name}"
            )
            call_command("tenant_migrate", academy=str(academy.id), verbosity=verbosity)
            processed += 1

        self.stdout.write(
            self.style.SUCCESS(f"tenant_migrate_all: processed {processed} schema(s).")
        )
