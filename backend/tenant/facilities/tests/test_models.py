"""Tests for facilities models."""
from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from saas_platform.tenants.models import Academy
from tenant.facilities.models import Bill, BillLineItem, FacilityRentConfig, InventoryItem, RentInvoice, RentPayment
from tenant.onboarding.models import Location


class FacilitiesModelTest(TestCase):
    def setUp(self):
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com',
            onboarding_completed=True,
        )
        self.location = Location.objects.create(
            academy=self.academy,
            name='Main Hall',
        )

    def test_rent_config_unique_per_period(self):
        FacilityRentConfig.objects.create(
            academy=self.academy,
            location=self.location,
            amount=Decimal('1500.00'),
            currency='USD',
            period_type=FacilityRentConfig.PeriodType.MONTH,
        )
        with self.assertRaises(Exception):
            FacilityRentConfig.objects.create(
                academy=self.academy,
                location=self.location,
                amount=Decimal('1600.00'),
                currency='USD',
                period_type=FacilityRentConfig.PeriodType.MONTH,
            )

    def test_rent_invoice_overdue_status(self):
        invoice = RentInvoice.objects.create(
            academy=self.academy,
            location=self.location,
            invoice_number='RINV-test-academy-2026-001',
            amount=Decimal('1000.00'),
            period_description='January 2026',
            due_date=timezone.now().date() - timedelta(days=1),
            status=RentInvoice.Status.PENDING,
        )

        invoice.update_status()
        invoice.save(update_fields=['status', 'updated_at'])
        invoice.refresh_from_db()

        self.assertEqual(invoice.status, RentInvoice.Status.OVERDUE)

    def test_rent_payment_updates_invoice_status_paid(self):
        invoice = RentInvoice.objects.create(
            academy=self.academy,
            location=self.location,
            invoice_number='RINV-test-academy-2026-002',
            amount=Decimal('800.00'),
            period_description='February 2026',
            status=RentInvoice.Status.PENDING,
        )

        RentPayment.objects.create(
            rent_invoice=invoice,
            amount=Decimal('800.00'),
            payment_method='CARD',
        )

        invoice.refresh_from_db()
        self.assertEqual(invoice.status, RentInvoice.Status.PAID)

    def test_bill_line_item_calculates_line_total(self):
        bill = Bill.objects.create(
            academy=self.academy,
            vendor_name='Sports Vendor',
            bill_date=timezone.now().date(),
        )
        line = BillLineItem.objects.create(
            bill=bill,
            description='Football balls',
            quantity=4,
            unit_price=Decimal('25.00'),
        )
        self.assertEqual(line.line_total, Decimal('100.00'))

    def test_bill_unique_number_optional(self):
        Bill.objects.create(
            academy=self.academy,
            vendor_name='Vendor A',
            bill_number='BILL-001',
            bill_date=timezone.now().date(),
        )
        with self.assertRaises(Exception):
            Bill.objects.create(
                academy=self.academy,
                vendor_name='Vendor B',
                bill_number='BILL-001',
                bill_date=timezone.now().date(),
            )

    def test_rent_payment_cannot_be_added_to_cancelled_invoice(self):
        invoice = RentInvoice.objects.create(
            academy=self.academy,
            location=self.location,
            invoice_number='RINV-test-academy-2026-003',
            amount=Decimal('500.00'),
            period_description='March 2026',
            status=RentInvoice.Status.CANCELLED,
        )
        payment = RentPayment(
            rent_invoice=invoice,
            amount=Decimal('100.00'),
            payment_method='CASH',
        )
        with self.assertRaises(ValidationError):
            payment.full_clean()

    def test_inventory_unique_name_per_academy(self):
        InventoryItem.objects.create(
            academy=self.academy,
            name='Cones',
            quantity=10,
            unit='pcs',
        )
        with self.assertRaises(Exception):
            InventoryItem.objects.create(
                academy=self.academy,
                name='Cones',
                quantity=5,
                unit='pcs',
            )
