"""Tests for facilities models."""
from datetime import date, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from saas_platform.tenants.models import Academy
from tenant.facilities.models import (
    Bill,
    BillLineItem,
    FacilityRentConfig,
    InventoryItem,
    RentInvoice,
    RentPaySchedule,
    RentPayment,
)
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

    def test_rent_pay_schedule_session_requires_sessions_per_invoice(self):
        schedule = RentPaySchedule(
            academy=self.academy,
            location=self.location,
            billing_type=RentPaySchedule.BillingType.SESSION,
            amount=Decimal('50.00'),
            currency='AED',
            sessions_per_invoice=None,
            billing_day=None,
            cycle_start_date=date(2026, 1, 1),
        )
        with self.assertRaises(ValidationError) as ctx:
            schedule.full_clean()
        self.assertIn('sessions_per_invoice', ctx.exception.error_dict)

    def test_rent_pay_schedule_monthly_requires_billing_day(self):
        schedule = RentPaySchedule(
            academy=self.academy,
            location=self.location,
            billing_type=RentPaySchedule.BillingType.MONTHLY,
            amount=Decimal('5000.00'),
            currency='AED',
            sessions_per_invoice=None,
            billing_day=None,
            cycle_start_date=date(2026, 1, 1),
        )
        with self.assertRaises(ValidationError) as ctx:
            schedule.full_clean()
        self.assertIn('billing_day', ctx.exception.error_dict)

    def test_rent_pay_schedule_unique_per_location_billing_type(self):
        RentPaySchedule.objects.create(
            academy=self.academy,
            location=self.location,
            billing_type=RentPaySchedule.BillingType.MONTHLY,
            amount=Decimal('1000.00'),
            currency='AED',
            billing_day=15,
            cycle_start_date=date(2026, 1, 1),
        )
        dup = RentPaySchedule(
            academy=self.academy,
            location=self.location,
            billing_type=RentPaySchedule.BillingType.MONTHLY,
            amount=Decimal('2000.00'),
            currency='AED',
            billing_day=20,
            cycle_start_date=date(2026, 1, 1),
        )
        with self.assertRaises(ValidationError):
            dup.full_clean()

    def test_rent_invoice_schedule_fk_nullable(self):
        inv = RentInvoice.objects.create(
            academy=self.academy,
            location=self.location,
            invoice_number='RINV-test-academy-2026-099',
            amount=Decimal('100.00'),
            period_description='Test',
            schedule=None,
        )
        inv.refresh_from_db()
        self.assertIsNone(inv.schedule_id)
