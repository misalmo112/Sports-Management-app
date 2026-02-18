from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from saas_platform.tenants.models import Academy
from shared.tenancy.schema import build_schema_name, is_valid_schema_name


TABLE_COPY_PLAN = [
    {'table': 'tenant_locations', 'where': 'academy_id = %s'},
    {'table': 'tenant_sports', 'where': 'academy_id = %s'},
    {'table': 'tenant_age_categories', 'where': 'academy_id = %s'},
    {'table': 'tenant_terms', 'where': 'academy_id = %s'},
    {'table': 'tenant_pricing_items', 'where': 'academy_id = %s'},
    {'table': 'tenant_users', 'where': 'academy_id = %s'},
    {'table': 'tenant_admin_profiles', 'where': 'academy_id = %s'},
    {'table': 'tenant_coach_profiles', 'where': 'academy_id = %s'},
    {'table': 'tenant_parent_profiles', 'where': 'academy_id = %s'},
    {'table': 'tenant_invite_tokens', 'where': 'academy_id = %s'},
    {'table': 'tenant_parents', 'where': 'academy_id = %s'},
    {'table': 'tenant_students', 'where': 'academy_id = %s'},
    {'table': 'tenant_coaches', 'where': 'academy_id = %s'},
    {'table': 'tenant_classes', 'where': 'academy_id = %s'},
    {'table': 'tenant_enrollments', 'where': 'academy_id = %s'},
    {'table': 'tenant_attendance', 'where': 'academy_id = %s'},
    {'table': 'tenant_coach_attendance', 'where': 'academy_id = %s'},
    {'table': 'tenant_media_files', 'where': 'academy_id = %s'},
    {'table': 'tenant_billing_items', 'where': 'academy_id = %s'},
    {'table': 'tenant_invoices', 'where': 'academy_id = %s'},
    {
        'table': 'tenant_invoice_items',
        'join': 'JOIN public.tenant_invoices inv ON src.invoice_id = inv.id',
        'where': 'inv.academy_id = %s',
    },
    {'table': 'tenant_receipts', 'where': 'academy_id = %s'},
    {'table': 'tenant_facility_rent_configs', 'where': 'academy_id = %s'},
    {'table': 'tenant_rent_invoices', 'where': 'academy_id = %s'},
    {
        'table': 'tenant_rent_payments',
        'join': 'JOIN public.tenant_rent_invoices rinv ON src.rent_invoice_id = rinv.id',
        'where': 'rinv.academy_id = %s',
    },
    {'table': 'tenant_bills', 'where': 'academy_id = %s'},
    {
        'table': 'tenant_bill_line_items',
        'join': 'JOIN public.tenant_bills bill ON src.bill_id = bill.id',
        'where': 'bill.academy_id = %s',
    },
    {'table': 'tenant_inventory_items', 'where': 'academy_id = %s'},
    {'table': 'tenant_complaints', 'where': 'academy_id = %s'},
    {'table': 'tenant_quotas', 'where': 'academy_id = %s'},
    {'table': 'tenant_usages', 'where': 'academy_id = %s'},
]


class Command(BaseCommand):
    help = "Backfill tenant data from public schema into a tenant schema."

    def add_arguments(self, parser):
        parser.add_argument('--academy', type=str, required=True, help='Academy UUID')
        parser.add_argument('--schema', type=str, help='Schema name (optional)')

    def handle(self, *args, **options):
        if connection.vendor != 'postgresql':
            raise CommandError('Backfill is only supported on Postgres.')

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

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM information_schema.schemata WHERE schema_name = %s",
                [schema_name],
            )
            if cursor.fetchone() is None:
                raise CommandError(f'Schema not found: {schema_name}')

        def qname(name):
            return connection.ops.quote_name(name)

        def qualified(schema, table):
            return f"{qname(schema)}.{qname(table)}"

        with transaction.atomic():
            with connection.cursor() as cursor:
                for spec in TABLE_COPY_PLAN:
                    table = spec['table']
                    target = qualified(schema_name, table)
                    if table == 'tenant_invite_tokens':
                        sql = (
                            f"INSERT INTO {target} "
                            "(id, token_hash, expires_at, used_at, created_at, updated_at, "
                            "academy_id, created_by_id, user_id) "
                            "SELECT src.id, src.token_hash, src.expires_at, src.used_at, "
                            "src.created_at, src.updated_at, src.academy_id, "
                            "CASE WHEN creator.id IS NULL THEN NULL ELSE src.created_by_id END, "
                            "src.user_id "
                            "FROM public.tenant_invite_tokens src "
                            "JOIN public.tenant_users invitee "
                            "  ON invitee.id = src.user_id "
                            " AND invitee.academy_id = src.academy_id "
                            "LEFT JOIN public.tenant_users creator "
                            "  ON creator.id = src.created_by_id "
                            " AND creator.academy_id = src.academy_id "
                            "WHERE src.academy_id = %s "
                            "ON CONFLICT DO NOTHING"
                        )
                        cursor.execute(sql, [academy_id])
                        continue
                    if spec.get('join'):
                        sql = (
                            f"INSERT INTO {target} "
                            f"SELECT src.* FROM public.{table} src "
                            f"{spec['join']} "
                            f"WHERE {spec['where']} "
                            f"ON CONFLICT DO NOTHING"
                        )
                    else:
                        sql = (
                            f"INSERT INTO {target} "
                            f"SELECT * FROM public.{table} "
                            f"WHERE {spec['where']} "
                            f"ON CONFLICT DO NOTHING"
                        )
                    cursor.execute(sql, [academy_id])

        self.stdout.write(self.style.SUCCESS(f'Backfill completed for {schema_name}.'))
