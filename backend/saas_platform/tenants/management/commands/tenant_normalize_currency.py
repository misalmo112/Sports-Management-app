from django.core.management import BaseCommand
from django.db import connection
from django.db.utils import ProgrammingError

from saas_platform.tenants.models import Academy
from shared.tenancy.schema import build_schema_name, is_valid_schema_name, schema_context


class Command(BaseCommand):
    help = "Normalize tenant currency columns to match each academy's academy.currency."

    TENANT_TABLES = [
        'tenant_billing_items',          # Item.currency
        'tenant_facility_rent_configs', # FacilityRentConfig.currency
        'tenant_rent_invoices',         # RentInvoice.currency
        'tenant_bills',                 # Bill.currency
        'tenant_staff_invoices',        # StaffInvoice.currency
        'tenant_pricing_items',        # PricingItem.currency
    ]

    def add_arguments(self, parser):
        parser.add_argument('--academy', type=str, required=False, help='Academy UUID (optional)')
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Calculate changes but do not persist any updates.',
        )

    def handle(self, *args, **options):
        dry_run = bool(options.get('dry_run'))
        academy_id = options.get('academy')

        academies = Academy.objects.all()
        if academy_id:
            academies = academies.filter(id=academy_id)

        if not academies.exists():
            self.stdout.write(self.style.WARNING('No academies found to normalize.'))
            return

        for academy in academies.select_related(None):
            schema_name = academy.schema_name or build_schema_name(academy.id)
            if not is_valid_schema_name(schema_name):
                self.stdout.write(
                    self.style.WARNING(f'Skipping academy {academy.id}: invalid schema name "{schema_name}".')
                )
                continue

            academy_currency = str(academy.currency or '').strip().upper() or 'USD'

            with schema_context(schema_name) as ok:
                if not ok:
                    self.stdout.write(
                        self.style.WARNING(f'Skipping academy {academy.id}: tenant schema not found "{schema_name}".')
                    )
                    continue

                with connection.cursor() as cursor:
                    for table in self.TENANT_TABLES:
                        try:
                            if dry_run:
                                cursor.execute(
                                    f"""
                                    SELECT COUNT(*)
                                    FROM {table}
                                    WHERE currency IS DISTINCT FROM %s
                                    """,
                                    [academy_currency],
                                )
                                count = cursor.fetchone()[0]
                                self.stdout.write(f'{academy.id} {table}: would_update={count}')
                            else:
                                cursor.execute(
                                    f"""
                                    UPDATE {table}
                                    SET currency = %s
                                    WHERE currency IS DISTINCT FROM %s
                                    """,
                                    [academy_currency, academy_currency],
                                )
                                updated = cursor.rowcount
                                self.stdout.write(f'{academy.id} {table}: updated={updated}')
                        except ProgrammingError:
                            # Missing tables/columns in partially migrated tenant schemas should not block all academies.
                            self.stdout.write(
                                self.style.WARNING(f'{academy.id} {table}: missing table/column; skipped.')
                            )

        self.stdout.write(self.style.SUCCESS('Currency normalization finished.'))

