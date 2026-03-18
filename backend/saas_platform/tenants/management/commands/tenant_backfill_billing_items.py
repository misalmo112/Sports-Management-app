from django.core.management.base import BaseCommand
from django.db import ProgrammingError

from saas_platform.tenants.models import Academy
from shared.tenancy.schema import build_schema_name, is_valid_schema_name, schema_context
from tenant.onboarding.models import PricingItem
from tenant.billing.models import Item as BillingItem


class Command(BaseCommand):
    help = (
        "Backfill tenant billing items from existing tenant pricing items. "
        "Useful after onboarding pricing was migrated to billing items."
    )

    def add_arguments(self, parser):
        parser.add_argument('--academy', type=str, required=False, help='Academy UUID (optional)')
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate backfill without writing any changes.',
        )

    def handle(self, *args, **options):
        dry_run = bool(options.get('dry_run'))
        academy_id = options.get('academy')

        academies = Academy.objects.all().order_by('id')
        if academy_id:
            academies = academies.filter(id=academy_id)

        if not academies.exists():
            self.stdout.write(self.style.WARNING('No academies found to backfill.'))
            return

        total_created = 0
        total_updated = 0
        total_skipped = 0

        for academy in academies.select_related(None):
            schema_name = academy.schema_name or build_schema_name(academy.id)
            if not is_valid_schema_name(schema_name):
                self.stdout.write(
                    self.style.WARNING(f'{academy.id}: invalid schema name "{schema_name}", skipped.')
                )
                total_skipped += 1
                continue

            with schema_context(schema_name) as ok:
                if not ok:
                    self.stdout.write(
                        self.style.WARNING(f'{academy.id}: tenant schema not found "{schema_name}", skipped.')
                    )
                    total_skipped += 1
                    continue

                try:
                    pricing_qs = PricingItem.objects.filter(academy=academy)
                    pricing_items = list(pricing_qs.order_by('id'))
                except ProgrammingError:
                    self.stdout.write(
                        self.style.WARNING(
                            f'{academy.id}: missing tenant_pricing_items table/columns, skipped.'
                        )
                    )
                    total_skipped += 1
                    continue

                if not pricing_items:
                    self.stdout.write(self.style.SUCCESS(f'{academy.id}: no pricing items, nothing to do.'))
                    continue

                # Existing billing items by name (we use name as the upsert key).
                existing_names = set()
                try:
                    if not dry_run:
                        existing_qs = BillingItem.objects.filter(academy=academy)
                        existing_names = set(existing_qs.values_list('name', flat=True))
                except ProgrammingError:
                    self.stdout.write(
                        self.style.WARNING(
                            f'{academy.id}: missing tenant_billing_items table/columns, skipped.'
                        )
                    )
                    total_skipped += 1
                    continue

                created_count = 0
                updated_count = 0

                # Seed known names for dry-run too.
                if dry_run:
                    existing_qs = BillingItem.objects.filter(academy=academy)
                    existing_names = set(existing_qs.values_list('name', flat=True))

                # Map onboarding PricingItem -> billing Item.
                # Billing Item does not store duration fields, so we preserve only:
                # - name, description, price, currency, active=true.
                for pricing in pricing_items:
                    defaults = {
                        'description': pricing.description or '',
                        'price': pricing.price,
                        'currency': (pricing.currency or '').strip().upper() or 'USD',
                        'is_active': True,
                    }

                    if not dry_run:
                        obj, created = BillingItem.objects.update_or_create(
                            academy=academy,
                            name=pricing.name,
                            defaults=defaults,
                        )
                        if created:
                            created_count += 1
                            existing_names.add(obj.name)
                        else:
                            updated_count += 1
                    else:
                        if pricing.name in existing_names:
                            updated_count += 1
                        else:
                            created_count += 1
                            existing_names.add(pricing.name)

                total_created += created_count
                total_updated += updated_count

                action = 'DRY-RUN' if dry_run else 'BACKFILLED'
                self.stdout.write(
                    self.style.SUCCESS(
                        f'{action} {academy.id}: created={created_count}, updated={updated_count}'
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'Done. total_created={total_created}, total_updated={total_updated}, total_skipped={total_skipped}'
            )
        )

