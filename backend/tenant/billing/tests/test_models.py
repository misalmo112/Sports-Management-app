"""
Tests for billing models.
"""
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from saas_platform.tenants.models import Academy
from tenant.students.models import Parent, Student
from tenant.billing.models import Item, Invoice, InvoiceItem, Receipt


class ItemModelTest(TestCase):
    """Test Item model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
            onboarding_completed=True
        )
    
    def test_create_item(self):
        """Test creating an item."""
        item = Item.objects.create(
            academy=self.academy,
            name="Monthly Fee",
            description="Monthly class fee",
            price=Decimal('100.00'),
            currency='USD'
        )
        self.assertEqual(item.name, "Monthly Fee")
        self.assertEqual(item.price, Decimal('100.00'))
        self.assertTrue(item.is_active)
    
    def test_item_str(self):
        """Test item string representation."""
        item = Item.objects.create(
            academy=self.academy,
            name="Equipment Fee",
            price=Decimal('50.00')
        )
        self.assertIn("Equipment Fee", str(item))
        self.assertIn(self.academy.name, str(item))


class InvoiceModelTest(TestCase):
    """Test Invoice model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
            onboarding_completed=True
        )
        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com"
        )
    
    def test_create_invoice(self):
        """Test creating an invoice."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            status=Invoice.Status.DRAFT
        )
        self.assertEqual(invoice.parent, self.parent)
        self.assertEqual(invoice.status, Invoice.Status.DRAFT)
        self.assertEqual(invoice.subtotal, Decimal('0.00'))
        self.assertEqual(invoice.total, Decimal('0.00'))
    
    def test_calculate_totals_with_items(self):
        """Test calculating invoice totals with items."""
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
            unit_price=Decimal('50.00')
        )
        InvoiceItem.objects.create(
            invoice=invoice,
            description="Item 2",
            quantity=1,
            unit_price=Decimal('30.00')
        )
        
        invoice.calculate_totals()
        invoice.save()
        
        self.assertEqual(invoice.subtotal, Decimal('130.00'))
        self.assertEqual(invoice.total, Decimal('130.00'))
    
    def test_calculate_totals_with_percentage_discount(self):
        """Test calculating totals with percentage discount."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            discount_type=Invoice.DiscountType.PERCENTAGE,
            discount_value=Decimal('10.00')
        )
        
        InvoiceItem.objects.create(
            invoice=invoice,
            description="Item 1",
            quantity=1,
            unit_price=Decimal('100.00')
        )
        
        invoice.calculate_totals()
        invoice.save()
        
        self.assertEqual(invoice.subtotal, Decimal('100.00'))
        self.assertEqual(invoice.discount_amount, Decimal('10.00'))
        self.assertEqual(invoice.total, Decimal('90.00'))
    
    def test_calculate_totals_with_fixed_discount(self):
        """Test calculating totals with fixed discount."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            discount_type=Invoice.DiscountType.FIXED,
            discount_value=Decimal('20.00')
        )
        
        InvoiceItem.objects.create(
            invoice=invoice,
            description="Item 1",
            quantity=1,
            unit_price=Decimal('100.00')
        )
        
        invoice.calculate_totals()
        invoice.save()
        
        self.assertEqual(invoice.subtotal, Decimal('100.00'))
        self.assertEqual(invoice.discount_amount, Decimal('20.00'))
        self.assertEqual(invoice.total, Decimal('80.00'))
    
    def test_get_paid_amount(self):
        """Test getting paid amount."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal('100.00')
        )
        
        Receipt.objects.create(
            academy=self.academy,
            invoice=invoice,
            receipt_number="RCP-001",
            amount=Decimal('50.00'),
            payment_method=Receipt.PaymentMethod.CASH
        )
        Receipt.objects.create(
            academy=self.academy,
            invoice=invoice,
            receipt_number="RCP-002",
            amount=Decimal('30.00'),
            payment_method=Receipt.PaymentMethod.CARD
        )
        
        self.assertEqual(invoice.get_paid_amount(), Decimal('80.00'))
    
    def test_get_remaining_balance(self):
        """Test getting remaining balance."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal('100.00')
        )
        
        Receipt.objects.create(
            academy=self.academy,
            invoice=invoice,
            receipt_number="RCP-001",
            amount=Decimal('60.00'),
            payment_method=Receipt.PaymentMethod.CASH
        )
        
        self.assertEqual(invoice.get_remaining_balance(), Decimal('40.00'))
    
    def test_update_status_to_paid(self):
        """Test updating status to paid."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal('100.00'),
            status=Invoice.Status.SENT
        )
        
        Receipt.objects.create(
            academy=self.academy,
            invoice=invoice,
            receipt_number="RCP-001",
            amount=Decimal('100.00'),
            payment_method=Receipt.PaymentMethod.CASH
        )
        
        invoice.update_status()
        invoice.save()
        
        self.assertEqual(invoice.status, Invoice.Status.PAID)
    
    def test_update_status_to_partially_paid(self):
        """Test updating status to partially paid."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal('100.00'),
            status=Invoice.Status.SENT
        )
        
        Receipt.objects.create(
            academy=self.academy,
            invoice=invoice,
            receipt_number="RCP-001",
            amount=Decimal('50.00'),
            payment_method=Receipt.PaymentMethod.CASH
        )
        
        invoice.update_status()
        invoice.save()
        
        self.assertEqual(invoice.status, Invoice.Status.PARTIALLY_PAID)
    
    def test_update_status_to_overdue(self):
        """Test updating status to overdue."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal('100.00'),
            status=Invoice.Status.SENT,
            due_date=timezone.now().date() - timezone.timedelta(days=1)
        )
        
        invoice.update_status()
        invoice.save()
        
        self.assertEqual(invoice.status, Invoice.Status.OVERDUE)
    
    def test_invoice_validation_percentage_discount_over_100(self):
        """Test validation for percentage discount over 100%."""
        invoice = Invoice(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            discount_type=Invoice.DiscountType.PERCENTAGE,
            discount_value=Decimal('150.00')
        )
        
        with self.assertRaises(ValidationError):
            invoice.full_clean()


class InvoiceItemModelTest(TestCase):
    """Test InvoiceItem model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
            onboarding_completed=True
        )
        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com"
        )
        self.invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001"
        )
    
    def test_create_invoice_item(self):
        """Test creating an invoice item."""
        item = InvoiceItem.objects.create(
            invoice=self.invoice,
            description="Test Item",
            quantity=2,
            unit_price=Decimal('25.00')
        )
        self.assertEqual(item.line_total, Decimal('50.00'))
    
    def test_invoice_item_calculates_line_total(self):
        """Test that invoice item calculates line total correctly."""
        item = InvoiceItem.objects.create(
            invoice=self.invoice,
            description="Test Item",
            quantity=3,
            unit_price=Decimal('10.00')
        )
        self.assertEqual(item.line_total, Decimal('30.00'))


class ReceiptModelTest(TestCase):
    """Test Receipt model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
            onboarding_completed=True
        )
        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com"
        )
        self.invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal('100.00')
        )
    
    def test_create_receipt(self):
        """Test creating a receipt."""
        receipt = Receipt.objects.create(
            academy=self.academy,
            invoice=self.invoice,
            receipt_number="RCP-001",
            amount=Decimal('50.00'),
            payment_method=Receipt.PaymentMethod.CASH
        )
        self.assertEqual(receipt.amount, Decimal('50.00'))
        self.assertEqual(receipt.payment_method, Receipt.PaymentMethod.CASH)
    
    def test_receipt_updates_invoice_status(self):
        """Test that receipt creation updates invoice status."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-002",
            total=Decimal('100.00'),
            status=Invoice.Status.SENT
        )
        
        Receipt.objects.create(
            academy=self.academy,
            invoice=invoice,
            receipt_number="RCP-002",
            amount=Decimal('100.00'),
            payment_method=Receipt.PaymentMethod.CASH
        )
        
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.PAID)
