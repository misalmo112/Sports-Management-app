"""Tests for facilities API views."""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from saas_platform.tenants.models import Academy
from tenant.facilities.models import Bill, InventoryItem, RentInvoice
from tenant.onboarding.models import Location

User = get_user_model()


class FacilitiesViewSetTest(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com',
            onboarding_completed=True,
        )
        self.location = Location.objects.create(academy=self.academy, name='Main Hall')

        self.plan = Plan.objects.create(name='Basic', slug='basic', limits_json={'max_students': 100})
        Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now(),
        )

        self.admin = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            role='ADMIN',
            academy=self.academy,
            is_active=True,
        )

        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

    def test_create_rent_config(self):
        response = self.client.post(
            '/api/v1/tenant/facilities/rent-configs/',
            {
                'location': self.location.id,
                'amount': '1200.00',
                'currency': 'USD',
                'period_type': 'MONTH',
                'is_active': True,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_rent_invoice(self):
        response = self.client.post(
            '/api/v1/tenant/facilities/rent-invoices/',
            {
                'location': self.location.id,
                'amount': '850.00',
                'currency': 'USD',
                'period_description': 'January 2026',
                'status': 'PENDING',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data.get('invoice_number'))
        self.assertEqual(response.data.get('issued_date'), timezone.now().date().isoformat())

    def test_create_duplicate_rent_config_returns_400(self):
        payload = {
            'location': self.location.id,
            'amount': '1200.00',
            'currency': 'USD',
            'period_type': 'MONTH',
            'is_active': True,
        }

        first = self.client.post('/api/v1/tenant/facilities/rent-configs/', payload, format='json')
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self.client.post('/api/v1/tenant/facilities/rent-configs/', payload, format='json')
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_payment_to_rent_invoice(self):
        invoice = RentInvoice.objects.create(
            academy=self.academy,
            location=self.location,
            invoice_number='RINV-test-academy-2026-001',
            amount=Decimal('500.00'),
            period_description='January 2026',
            status=RentInvoice.Status.PENDING,
        )

        response = self.client.post(
            f'/api/v1/tenant/facilities/rent-invoices/{invoice.id}/add_payment/',
            {
                'amount': '500.00',
                'payment_method': 'CARD',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, RentInvoice.Status.PAID)

    def test_mark_bill_paid(self):
        bill = Bill.objects.create(
            academy=self.academy,
            vendor_name='Vendor',
            bill_date=timezone.now().date(),
            due_date=timezone.now().date() + timedelta(days=5),
            status=Bill.Status.PENDING,
        )

        response = self.client.post(
            f'/api/v1/tenant/facilities/bills/{bill.id}/mark_paid/',
            {},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        bill.refresh_from_db()
        self.assertEqual(bill.status, Bill.Status.PAID)

    def test_create_bill_and_inventory_item(self):
        bill_response = self.client.post(
            '/api/v1/tenant/facilities/bills/',
            {
                'vendor_name': 'Training Shop',
                'currency': 'USD',
                'status': 'PENDING',
            },
            format='json',
        )
        self.assertEqual(bill_response.status_code, status.HTTP_201_CREATED)

        inventory_response = self.client.post(
            '/api/v1/tenant/facilities/inventory-items/',
            {
                'name': 'Training Bibs',
                'quantity': 12,
                'unit': 'pcs',
            },
            format='json',
        )
        self.assertEqual(inventory_response.status_code, status.HTTP_201_CREATED)

    def test_bill_line_item_updates_inventory(self):
        bill = Bill.objects.create(
            academy=self.academy,
            vendor_name='Vendor',
            bill_date=timezone.now().date(),
            status=Bill.Status.PENDING,
        )
        inventory_item = InventoryItem.objects.create(
            academy=self.academy,
            name='Cones',
            quantity=1,
            unit='pcs',
        )

        response = self.client.post(
            '/api/v1/tenant/facilities/bill-line-items/',
            {
                'bill': bill.id,
                'description': 'Training cones',
                'quantity': 3,
                'unit_price': '12.00',
                'inventory_item': inventory_item.id,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        inventory_item.refresh_from_db()
        bill.refresh_from_db()
        self.assertEqual(inventory_item.quantity, 4)
        self.assertEqual(bill.total_amount, Decimal('36.00'))

    def test_adjust_inventory_quantity_endpoint(self):
        item = InventoryItem.objects.create(
            academy=self.academy,
            name='Balls',
            quantity=5,
            unit='pcs',
        )
        response = self.client.post(
            f'/api/v1/tenant/facilities/inventory-items/{item.id}/adjust_quantity/',
            {'delta': -2},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.quantity, 3)

    def test_academy_isolation_for_bills(self):
        academy2 = Academy.objects.create(
            name='Other Academy',
            slug='other-academy',
            email='other@example.com',
            onboarding_completed=True,
        )
        Bill.objects.create(
            academy=academy2,
            vendor_name='Other Vendor',
            bill_date=timezone.now().date(),
        )

        response = self.client.get('/api/v1/tenant/facilities/bills/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)
