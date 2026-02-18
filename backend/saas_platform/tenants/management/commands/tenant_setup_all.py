from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connection
from saas_platform.tenants.models import Academy
from shared.tenancy.schema import build_schema_name, is_valid_schema_name


class Command(BaseCommand):
    help = "Create schema, migrate, backfill, verify, and sync sequences for academies."

    def add_arguments(self, parser):
        parser.add_argument('--academy', type=str, help='Single academy UUID')
        parser.add_argument('--limit', type=int, help='Limit number of academies')
        parser.add_argument('--skip-migrate', action='store_true', help='Skip tenant migrations')
        parser.add_argument('--skip-backfill', action='store_true', help='Skip backfill')
        parser.add_argument('--skip-verify', action='store_true', help='Skip verification')
        parser.add_argument('--skip-sequences', action='store_true', help='Skip sequence sync')
        parser.add_argument('--dry-run', action='store_true', help='Print actions only')
        parser.add_argument('--resume', action='store_true', help='Skip academies with existing schema')

    def handle(self, *args, **options):
        academy_id = options.get('academy')
        limit = options.get('limit')

        if academy_id:
            academies = Academy.objects.filter(id=academy_id)
        else:
            academies = Academy.objects.all().order_by('created_at')
            if limit:
                academies = academies[:limit]

        skip_migrate = options.get('skip_migrate')
        skip_backfill = options.get('skip_backfill')
        skip_verify = options.get('skip_verify')
        skip_sequences = options.get('skip_sequences')
        dry_run = options.get('dry_run')
        resume = options.get('resume')

        if not academies.exists():
            self.stdout.write("No academies found.")
            return

        def schema_exists(schema_name):
            if connection.vendor != 'postgresql':
                return False
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM information_schema.schemata WHERE schema_name = %s",
                    [schema_name],
                )
                return cursor.fetchone() is not None

        def schema_has_tenant_tables(schema_name):
            if connection.vendor != 'postgresql':
                return False
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = %s
                      AND table_name LIKE 'tenant_%%'
                    LIMIT 1
                    """,
                    [schema_name],
                )
                return cursor.fetchone() is not None

        for academy in academies:
            schema_name = academy.schema_name or build_schema_name(academy.id)
            if resume and is_valid_schema_name(schema_name):
                if schema_exists(schema_name) and schema_has_tenant_tables(schema_name):
                    self.stdout.write(
                        f"Skipping academy {academy.id} ({academy.name}) - schema exists"
                    )
                    continue
            self.stdout.write(f"Processing academy {academy.id} ({academy.name})")
            if dry_run:
                self.stdout.write("  - create_tenant_schema")
                if not skip_migrate:
                    self.stdout.write("  - tenant_migrate")
                if not skip_backfill:
                    self.stdout.write("  - tenant_backfill")
                if not skip_verify:
                    self.stdout.write("  - tenant_verify")
                if not skip_sequences:
                    self.stdout.write("  - tenant_sync_sequences")
                continue

            call_command('create_tenant_schema', academy=str(academy.id))
            if not skip_migrate:
                call_command('tenant_migrate', academy=str(academy.id))
            if not skip_backfill:
                call_command('tenant_backfill', academy=str(academy.id))
            if not skip_verify:
                call_command('tenant_verify', academy=str(academy.id))
            if not skip_sequences:
                call_command('tenant_sync_sequences', academy=str(academy.id))

        self.stdout.write(self.style.SUCCESS('Tenant setup complete.'))
