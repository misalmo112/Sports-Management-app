"""Tests for facilities services."""
from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from saas_platform.tenants.models import Academy
from tenant.facilities.models import Bill, InventoryItem, RentInvoice
from tenant.facilities.services import FacilitiesService
from tenant.onboarding.models import Location


class FacilitiesServiceTest(TestCase):
    def setUp(self):
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com',
            onboarding_completed=True,
        )
        self.location = Location.objects.create(academy=self.academy, name='Main Hall')

    def test_generate_rent_invoice_number(self):
        number1 = FacilitiesService.generate_rent_invoice_number(self.academy)
        self.assertTrue(number1.startswith(f"RINV-{self.academy.slug}-{timezone.now().year}-"))

        RentInvoice.objects.create(
            academy=self.academy,
            location=self.location,
            invoice_number=number1,
            amount=Decimal('100.00'),
            period_description='Period 1',
        )
        number2 = FacilitiesService.generate_rent_invoice_number(self.academy)
        self.assertNotEqual(number1, number2)

    def test_adjust_inventory_quantity_rejects_negative_result(self):
        item = InventoryItem.objects.create(
            academy=self.academy,
            name='Balls',
            quantity=2,
            unit='pcs',
        )

        with self.assertRaises(ValidationError):
            FacilitiesService.adjust_inventory_quantity(item, -3)

    def test_bill_line_item_inventory_deltas(self):
        bill = Bill.objects.create(
            academy=self.academy,
            vendor_name='Vendor',
            bill_date=timezone.now().date(),
            due_date=timezone.now().date() + timedelta(days=7),
        )
        item = InventoryItem.objects.create(
            academy=self.academy,
            name='Cones',
            quantity=0,
            unit='pcs',
        )

        line = FacilitiesService.create_bill_line_item(
            bill=bill,
            description='Cones batch',
            quantity=5,
            unit_price=Decimal('10.00'),
            inventory_item=item,
        )
        item.refresh_from_db()
        bill.refresh_from_db()
        self.assertEqual(item.quantity, 5)
        self.assertEqual(bill.total_amount, Decimal('50.00'))

        FacilitiesService.update_bill_line_item(line, quantity=8)
        item.refresh_from_db()
        bill.refresh_from_db()
        self.assertEqual(item.quantity, 8)
        self.assertEqual(bill.total_amount, Decimal('80.00'))

        FacilitiesService.delete_bill_line_item(line)
        item.refresh_from_db()
        bill.refresh_from_db()
        self.assertEqual(item.quantity, 0)
        self.assertEqual(bill.total_amount, Decimal('0.00'))

    def test_mark_rent_invoice_paid_creates_payment(self):
        invoice = RentInvoice.objects.create(
            academy=self.academy,
            location=self.location,
            invoice_number='RINV-test-academy-2026-001',
            amount=Decimal('500.00'),
            period_description='January 2026',
            status=RentInvoice.Status.PENDING,
        )

        payment = FacilitiesService.mark_rent_invoice_paid(
            invoice,
            payment_method='BANK_TRANSFER',
        )
        invoice.refresh_from_db()

        self.assertIsNotNone(payment)
        self.assertEqual(payment.amount, Decimal('500.00'))
        self.assertEqual(invoice.status, RentInvoice.Status.PAID)
