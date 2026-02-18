"""
Tests for financial calculations.
"""
from django.test import TestCase
from django.utils import timezone
from decimal import Decimal
from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from tenant.students.models import Parent
from tenant.billing.models import Invoice, InvoiceItem, Receipt
from tenant.billing.services import InvoiceService


class CalculationTest(TestCase):
    """Test financial calculations."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
            onboarding_completed=True
        )
        
        self.plan = Plan.objects.create(
            name="Basic Plan",
            slug="basic-plan",
            limits_json={'max_students': 100}
        )
        self.subscription = Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )
        
        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com"
        )
    
    def test_invoice_total_calculation(self):
        """Test invoice total calculation: subtotal - discount + tax."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            subtotal=Decimal('100.00'),
            discount_amount=Decimal('10.00'),
            tax_amount=Decimal('5.00')
        )
        
        invoice.calculate_totals()
        invoice.save()
        
        # total = subtotal - discount + tax = 100 - 10 + 5 = 95
        self.assertEqual(invoice.total, Decimal('95.00'))
    
    def test_percentage_discount_calculation(self):
        """Test percentage discount calculation."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            subtotal=Decimal('200.00'),
            discount_type=Invoice.DiscountType.PERCENTAGE,
            discount_value=Decimal('15.00')
        )
        
        invoice.calculate_totals()
        invoice.save()
        
        # discount = 200 * 0.15 = 30
        self.assertEqual(invoice.discount_amount, Decimal('30.00'))
        self.assertEqual(invoice.total, Decimal('170.00'))
    
    def test_fixed_discount_calculation(self):
        """Test fixed discount calculation."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            subtotal=Decimal('150.00'),
            discount_type=Invoice.DiscountType.FIXED,
            discount_value=Decimal('25.00')
        )
        
        invoice.calculate_totals()
        invoice.save()
        
        self.assertEqual(invoice.discount_amount, Decimal('25.00'))
        self.assertEqual(invoice.total, Decimal('125.00'))
    
    def test_discount_cannot_exceed_subtotal(self):
        """Test that fixed discount cannot exceed subtotal."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            subtotal=Decimal('50.00'),
            discount_type=Invoice.DiscountType.FIXED,
            discount_value=Decimal('100.00')
        )
        
        invoice.calculate_totals()
        invoice.save()
        
        # Discount should be capped at subtotal
        self.assertEqual(invoice.discount_amount, Decimal('50.00'))
        self.assertEqual(invoice.total, Decimal('0.00'))
    
    def test_100_percent_discount(self):
        """Test 100% percentage discount."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            subtotal=Decimal('100.00'),
            discount_type=Invoice.DiscountType.PERCENTAGE,
            discount_value=Decimal('100.00')
        )
        
        invoice.calculate_totals()
        invoice.save()
        
        self.assertEqual(invoice.discount_amount, Decimal('100.00'))
        self.assertEqual(invoice.total, Decimal('0.00'))
    
    def test_partial_payment_calculation(self):
        """Test partial payment calculation."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal('200.00')
        )
        
        # Add partial payments
        Receipt.objects.create(
            academy=self.academy,
            invoice=invoice,
            receipt_number="RCP-001",
            amount=Decimal('75.00'),
            payment_method=Receipt.PaymentMethod.CASH
        )
        Receipt.objects.create(
            academy=self.academy,
            invoice=invoice,
            receipt_number="RCP-002",
            amount=Decimal('50.00'),
            payment_method=Receipt.PaymentMethod.CARD
        )
        
        paid = invoice.get_paid_amount()
        remaining = invoice.get_remaining_balance()
        
        self.assertEqual(paid, Decimal('125.00'))
        self.assertEqual(remaining, Decimal('75.00'))
    
    def test_multiple_items_subtotal(self):
        """Test subtotal calculation with multiple items."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001"
        )
        
        InvoiceItem.objects.create(
            invoice=invoice,
            description="Item 1",
            quantity=2,
            unit_price=Decimal('25.00')
        )
        InvoiceItem.objects.create(
            invoice=invoice,
            description="Item 2",
            quantity=3,
            unit_price=Decimal('10.00')
        )
        InvoiceItem.objects.create(
            invoice=invoice,
            description="Item 3",
            quantity=1,
            unit_price=Decimal('20.00')
        )
        
        invoice.calculate_totals()
        invoice.save()
        
        # 2*25 + 3*10 + 1*20 = 50 + 30 + 20 = 100
        self.assertEqual(invoice.subtotal, Decimal('100.00'))
    
    def test_line_total_calculation(self):
        """Test line total calculation: quantity * unit_price."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001"
        )
        
        item = InvoiceItem.objects.create(
            invoice=invoice,
            description="Test Item",
            quantity=5,
            unit_price=Decimal('12.50')
        )
        
        # 5 * 12.50 = 62.50
        self.assertEqual(item.line_total, Decimal('62.50'))
    
    def test_zero_amount_invoice(self):
        """Test invoice with zero amount."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            subtotal=Decimal('0.00')
        )
        
        invoice.calculate_totals()
        invoice.save()
        
        self.assertEqual(invoice.total, Decimal('0.00'))
    
    def test_negative_total_prevention(self):
        """Test that total cannot be negative."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            subtotal=Decimal('50.00'),
            discount_amount=Decimal('100.00'),
            tax_amount=Decimal('0.00')
        )
        
        invoice.calculate_totals()
        invoice.save()
        
        # Total should be 0, not negative
        self.assertEqual(invoice.total, Decimal('0.00'))
    
    def test_complex_calculation(self):
        """Test complex calculation with multiple items, discount, and tax."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001"
        )
        
        # Add items
        InvoiceItem.objects.create(
            invoice=invoice,
            description="Item 1",
            quantity=2,
            unit_price=Decimal('100.00')
        )
        InvoiceItem.objects.create(
            invoice=invoice,
            description="Item 2",
            quantity=1,
            unit_price=Decimal('50.00')
        )
        
        # Set discount and tax
        invoice.discount_type = Invoice.DiscountType.PERCENTAGE
        invoice.discount_value = Decimal('10.00')
        invoice.tax_amount = Decimal('5.00')
        
        invoice.calculate_totals()
        invoice.save()
        
        # subtotal = 2*100 + 1*50 = 250
        # discount = 250 * 0.10 = 25
        # total = 250 - 25 + 5 = 230
        self.assertEqual(invoice.subtotal, Decimal('250.00'))
        self.assertEqual(invoice.discount_amount, Decimal('25.00'))
        self.assertEqual(invoice.total, Decimal('230.00'))
