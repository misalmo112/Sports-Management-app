from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from saas_platform.tenants.models import Academy
from shared.tenancy.schema import build_schema_name, is_valid_schema_name


class Command(BaseCommand):
    help = "Create a Postgres schema for an academy."

    def add_arguments(self, parser):
        parser.add_argument('--academy', type=str, help='Academy UUID')
        parser.add_argument('--schema', type=str, help='Schema name (optional)')
        parser.add_argument('--force', action='store_true', help='Overwrite academy schema_name')

    def handle(self, *args, **options):
        if connection.vendor != 'postgresql':
            raise CommandError('Schema creation is only supported on Postgres.')

        academy_id = options.get('academy')
        schema_name = options.get('schema')

        academy = None
        if academy_id:
            try:
                academy = Academy.objects.get(id=academy_id)
            except Academy.DoesNotExist as exc:
                raise CommandError(f'Academy not found: {academy_id}') from exc

        if academy and not schema_name:
            schema_name = academy.schema_name or build_schema_name(academy.id)

        if not schema_name:
            raise CommandError('Provide --academy or --schema.')

        if not is_valid_schema_name(schema_name):
            raise CommandError(f'Invalid schema name: {schema_name}')

        with connection.cursor() as cursor:
            cursor.execute(
                f'CREATE SCHEMA IF NOT EXISTS {connection.ops.quote_name(schema_name)}'
            )

        if academy:
            if options.get('force') or not academy.schema_name:
                academy.schema_name = schema_name
                academy.save(update_fields=['schema_name', 'updated_at'])

        self.stdout.write(self.style.SUCCESS(f'Schema ready: {schema_name}'))
