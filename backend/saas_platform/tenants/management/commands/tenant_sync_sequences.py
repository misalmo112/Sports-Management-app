from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from saas_platform.tenants.models import Academy
from shared.tenancy.schema import build_schema_name, is_valid_schema_name


class Command(BaseCommand):
    help = "Sync serial sequences for tenant tables in a schema."

    def add_arguments(self, parser):
        parser.add_argument('--academy', type=str, help='Academy UUID')
        parser.add_argument('--schema', type=str, default='public', help='Schema name')

    def handle(self, *args, **options):
        if connection.vendor != 'postgresql':
            raise CommandError('Sequence sync is only supported on Postgres.')

        academy_id = options.get('academy')
        schema_name = options.get('schema')

        if academy_id:
            try:
                academy = Academy.objects.get(id=academy_id)
            except Academy.DoesNotExist as exc:
                raise CommandError(f'Academy not found: {academy_id}') from exc
            schema_name = academy.schema_name or build_schema_name(academy.id)

        if not schema_name:
            raise CommandError('Provide --academy or --schema.')

        if not is_valid_schema_name(schema_name) and schema_name != 'public':
            raise CommandError(f'Invalid schema name: {schema_name}')

        def qname(name):
            return connection.ops.quote_name(name)

        def qualified(schema, table):
            return f"{qname(schema)}.{qname(table)}"

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT table_name, column_name,
                       pg_get_serial_sequence(format('%%I.%%I', table_schema, table_name), column_name)
                FROM information_schema.columns
                WHERE table_schema = %s
                  AND table_name LIKE 'tenant_%%'
                  AND (
                    column_default LIKE 'nextval%%'
                    OR is_identity = 'YES'
                  )
                """,
                [schema_name]
            )
            rows = cursor.fetchall()

            if not rows:
                self.stdout.write("No sequences found.")
                return

            for table_name, column_name, sequence_name in rows:
                if not sequence_name:
                    continue
                cursor.execute(
                    f"SELECT MAX({qname(column_name)}) FROM {qualified(schema_name, table_name)}"
                )
                max_id = cursor.fetchone()[0]
                cursor.execute(
                    "SELECT setval(%s, %s, %s)",
                    [sequence_name, max_id or 1, max_id is not None]
                )
                self.stdout.write(
                    f"{schema_name}.{table_name}.{column_name}: "
                    f"set {sequence_name} to {max_id or 1}"
                )

        self.stdout.write(self.style.SUCCESS('Sequence sync complete.'))
