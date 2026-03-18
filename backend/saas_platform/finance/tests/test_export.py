import csv
import io
from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.finance.tasks import sync_payments_to_xero
from saas_platform.subscriptions.models import (
    PaymentMethod,
    Plan,
    PlatformPayment,
    Subscription,
    SubscriptionStatus,
)
from saas_platform.tenants.models import Academy


User = get_user_model()


class PaymentExportTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.export_url = '/api/v1/platform/finance/payments/export/'
        self.superadmin = User.objects.create_superuser(
            email='superadmin-export@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            is_active=True,
        )
        self.admin_academy = self.create_academy('Export Admin Academy', 'export-admin-academy')
        self.admin = User.objects.create_user(
            email='export-admin@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.admin_academy,
            is_active=True,
            is_superuser=False,
            is_staff=False,
        )
        self.plan = Plan.objects.create(
            name='Export Plan',
            slug='export-plan',
            price_monthly=Decimal('149.00'),
            currency='USD',
            limits_json={'max_students': 100, 'storage_bytes': 10737418240},
            is_active=True,
            is_public=True,
        )
        self.academy = self.create_academy('Export Academy', 'export-academy')
        self.subscription = Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now(),
        )

    def create_academy(self, name, slug):
        return Academy.objects.create(
            name=name,
            slug=slug,
            email=f'{slug}@example.com',
        )

    def create_payment(self, payment_date, amount='100.00', invoice_ref='INV-001'):
        return PlatformPayment.objects.create(
            subscription=self.subscription,
            academy=self.academy,
            amount=Decimal(amount),
            currency='USD',
            payment_method=PaymentMethod.CREDIT_CARD,
            payment_date=payment_date,
            invoice_ref=invoice_ref,
        )

    def parse_csv(self, response):
        content = response.content.decode('utf-8')
        return list(csv.reader(io.StringIO(content)))

    def test_export_returns_csv_content_type(self):
        self.create_payment(date(2025, 3, 10))
        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get(self.export_url, {'year': 2025, 'month': 3})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv')

    def test_export_filename_contains_year_month(self):
        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get(self.export_url, {'year': 2025, 'month': 3})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('filename="payments_2025_03.csv"', response['Content-Disposition'])

    def test_export_rows_match_payments_in_month(self):
        self.create_payment(date(2025, 3, 1), invoice_ref='INV-101')
        self.create_payment(date(2025, 3, 12), invoice_ref='INV-102')
        self.create_payment(date(2025, 3, 25), invoice_ref='INV-103')
        self.create_payment(date(2025, 4, 5), invoice_ref='INV-201')
        self.create_payment(date(2025, 4, 18), invoice_ref='INV-202')
        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get(self.export_url, {'year': 2025, 'month': 3})
        rows = self.parse_csv(response)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(rows), 4)

    def test_export_csv_columns(self):
        self.create_payment(date(2025, 3, 10))
        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get(self.export_url, {'year': 2025, 'month': 3})
        rows = self.parse_csv(response)

        self.assertEqual(
            rows[0],
            ['Date', 'Academy', 'Plan', 'Amount', 'Currency', 'Method', 'Invoice Ref'],
        )

    def test_export_default_to_current_month_if_no_params(self):
        current_month = timezone.now().date().replace(day=1)
        self.create_payment(current_month, invoice_ref='INV-CURRENT')
        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get(self.export_url)
        rows = self.parse_csv(response)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[1][-1], 'INV-CURRENT')

    def test_export_invalid_month_returns_400(self):
        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get(self.export_url, {'year': 2025, 'month': 15})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data, {'detail': 'Invalid year or month.'})

    def test_export_403_for_non_superadmin(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.export_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class SyncPaymentsToXeroTaskTestCase(TestCase):
    def setUp(self):
        self.plan = Plan.objects.create(
            name='Sync Plan',
            slug='sync-plan',
            price_monthly=Decimal('99.00'),
            currency='USD',
            limits_json={'max_students': 100, 'storage_bytes': 10737418240},
            is_active=True,
            is_public=True,
        )
        self.academy = Academy.objects.create(
            name='Sync Academy',
            slug='sync-academy',
            email='sync-academy@example.com',
        )
        self.subscription = Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now(),
        )

    def create_payment(self, synced_at=None):
        return PlatformPayment.objects.create(
            subscription=self.subscription,
            academy=self.academy,
            amount=Decimal('120.00'),
            currency='USD',
            payment_method=PaymentMethod.BANK_TRANSFER,
            payment_date=date(2025, 3, 10),
            synced_at=synced_at,
        )

    @patch('saas_platform.finance.tasks.xero_client.create_invoice')
    def test_sync_task_stamps_external_ref_and_synced_at(self, create_invoice_mock):
        payment = self.create_payment()
        create_invoice_mock.return_value = 'xero-123'

        sync_payments_to_xero()

        payment.refresh_from_db()
        self.assertEqual(payment.external_ref, 'xero-123')
        self.assertIsNotNone(payment.synced_at)

    @patch('saas_platform.finance.tasks.xero_client.create_invoice')
    def test_sync_task_skips_already_synced_payments(self, create_invoice_mock):
        payment = self.create_payment(synced_at=timezone.now())

        sync_payments_to_xero()

        payment.refresh_from_db()
        create_invoice_mock.assert_not_called()
        self.assertEqual(payment.external_ref, '')
