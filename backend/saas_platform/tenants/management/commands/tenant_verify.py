import csv
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from saas_platform.tenants.models import Academy
from shared.tenancy.schema import build_schema_name, is_valid_schema_name
from .tenant_backfill import TABLE_COPY_PLAN


class Command(BaseCommand):
    help = "Verify per-academy row counts between public and tenant schema."

    def add_arguments(self, parser):
        parser.add_argument('--academy', type=str, required=True, help='Academy UUID')
        parser.add_argument('--schema', type=str, help='Schema name (optional)')
        parser.add_argument('--output', type=str, help='CSV output path (optional)')

    def handle(self, *args, **options):
        if connection.vendor != 'postgresql':
            raise CommandError('Verification is only supported on Postgres.')

        academy_id = options['academy']
        schema_name = options.get('schema')

        try:
            academy = Academy.objects.get(id=academy_id)
        except Academy.DoesNotExist as exc:
            raise CommandError(f'Academy not found: {academy_id}') from exc

        if not schema_name:
            schema_name = academy.schema_name or build_schema_name(academy.id)

        if not is_valid_schema_name(schema_name):
            raise CommandError(f'Invalid schema name: {schema_name}')

        def qname(name):
            return connection.ops.quote_name(name)

        def qualified(schema, table):
            return f"{qname(schema)}.{qname(table)}"

        mismatches = 0
        rows = []
        with connection.cursor() as cursor:
            for spec in TABLE_COPY_PLAN:
                table = spec['table']
                if spec.get('join'):
                    public_sql = (
                        f"SELECT COUNT(*) FROM public.{table} src "
                        f"{spec['join']} "
                        f"WHERE {spec['where']}"
                    )
                else:
                    public_sql = (
                        f"SELECT COUNT(*) FROM public.{table} "
                        f"WHERE {spec['where']}"
                    )
                cursor.execute(public_sql, [academy_id])
                public_count = cursor.fetchone()[0]

                target_sql = f"SELECT COUNT(*) FROM {qualified(schema_name, table)}"
                cursor.execute(target_sql)
                tenant_count = cursor.fetchone()[0]

                status = 'OK'
                if public_count != tenant_count:
                    status = 'MISMATCH'
                    mismatches += 1
                rows.append((table, public_count, tenant_count, status))

                self.stdout.write(
                    f"{table}: public={public_count} tenant={tenant_count} [{status}]"
                )

        output_path = options.get('output')
        if output_path:
            with open(output_path, 'w', newline='', encoding='utf-8') as handle:
                writer = csv.writer(handle)
                writer.writerow(['table', 'public_count', 'tenant_count', 'status'])
                writer.writerows(rows)
            self.stdout.write(f"Wrote report to {output_path}")

        if mismatches:
            raise CommandError(f'Verification failed with {mismatches} mismatches.')

        self.stdout.write(self.style.SUCCESS('Verification passed.'))
