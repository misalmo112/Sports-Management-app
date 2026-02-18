"""
Tests for billing services.
"""
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from tenant.students.models import Parent, Student
from tenant.billing.models import Item, Invoice, InvoiceItem, Receipt
from tenant.billing.services import InvoiceService


class InvoiceServiceTest(TestCase):
    """Test InvoiceService."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
            onboarding_completed=True
        )
        
        # Create plan and subscription
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
        
        self.item = Item.objects.create(
            academy=self.academy,
            name="Monthly Fee",
            price=Decimal('100.00')
        )
    
    def test_create_invoice(self):
        """Test creating an invoice."""
        items_data = [
            {
                'item_id': self.item.id,
                'quantity': 1,
                'unit_price': Decimal('100.00'),
                'description': 'Monthly Fee'
            }
        ]
        
        invoice = InvoiceService.create_invoice(
            parent=self.parent,
            items_data=items_data
        )
        
        self.assertIsNotNone(invoice)
        self.assertEqual(invoice.parent, self.parent)
        self.assertEqual(invoice.status, Invoice.Status.DRAFT)
        self.assertEqual(invoice.items.count(), 1)
        self.assertEqual(invoice.subtotal, Decimal('100.00'))
    
    def test_create_invoice_with_custom_items(self):
        """Test creating invoice with custom items."""
        items_data = [
            {
                'description': 'Custom Item 1',
                'quantity': 2,
                'unit_price': Decimal('50.00')
            },
            {
                'description': 'Custom Item 2',
                'quantity': 1,
                'unit_price': Decimal('30.00')
            }
        ]
        
        invoice = InvoiceService.create_invoice(
            parent=self.parent,
            items_data=items_data
        )
        
        self.assertEqual(invoice.items.count(), 2)
        self.assertEqual(invoice.subtotal, Decimal('130.00'))
    
    def test_create_invoice_with_percentage_discount(self):
        """Test creating invoice with percentage discount."""
        items_data = [
            {
                'description': 'Item 1',
                'quantity': 1,
                'unit_price': Decimal('100.00')
            }
        ]
        
        invoice = InvoiceService.create_invoice(
            parent=self.parent,
            items_data=items_data,
            discount_type=Invoice.DiscountType.PERCENTAGE,
            discount_value=Decimal('10.00')
        )
        
        self.assertEqual(invoice.discount_type, Invoice.DiscountType.PERCENTAGE)
        self.assertEqual(invoice.discount_value, Decimal('10.00'))
        self.assertEqual(invoice.discount_amount, Decimal('10.00'))
        self.assertEqual(invoice.total, Decimal('90.00'))
    
    def test_create_invoice_with_fixed_discount(self):
        """Test creating invoice with fixed discount."""
        items_data = [
            {
                'description': 'Item 1',
                'quantity': 1,
                'unit_price': Decimal('100.00')
            }
        ]
        
        invoice = InvoiceService.create_invoice(
            parent=self.parent,
            items_data=items_data,
            discount_type=Invoice.DiscountType.FIXED,
            discount_value=Decimal('20.00')
        )
        
        self.assertEqual(invoice.discount_type, Invoice.DiscountType.FIXED)
        self.assertEqual(invoice.discount_amount, Decimal('20.00'))
        self.assertEqual(invoice.total, Decimal('80.00'))
    
    def test_apply_discount_percentage(self):
        """Test applying percentage discount."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            subtotal=Decimal('100.00'),
            total=Decimal('100.00')
        )
        
        InvoiceService.apply_discount(
            invoice,
            Invoice.DiscountType.PERCENTAGE,
            Decimal('15.00')
        )
        
        invoice.refresh_from_db()
        self.assertEqual(invoice.discount_amount, Decimal('15.00'))
        self.assertEqual(invoice.total, Decimal('85.00'))
    
    def test_apply_discount_fixed(self):
        """Test applying fixed discount."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            subtotal=Decimal('100.00'),
            total=Decimal('100.00')
        )
        
        InvoiceService.apply_discount(
            invoice,
            Invoice.DiscountType.FIXED,
            Decimal('25.00')
        )
        
        invoice.refresh_from_db()
        self.assertEqual(invoice.discount_amount, Decimal('25.00'))
        self.assertEqual(invoice.total, Decimal('75.00'))
    
    def test_apply_discount_to_paid_invoice_fails(self):
        """Test that applying discount to paid invoice fails."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            status=Invoice.Status.PAID,
            total=Decimal('100.00')
        )
        
        with self.assertRaises(ValidationError):
            InvoiceService.apply_discount(
                invoice,
                Invoice.DiscountType.PERCENTAGE,
                Decimal('10.00')
            )
    
    def test_add_payment(self):
        """Test adding payment to invoice."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal('100.00'),
            status=Invoice.Status.SENT
        )
        
        receipt = InvoiceService.add_payment(
            invoice,
            Decimal('50.00'),
            Receipt.PaymentMethod.CASH
        )
        
        self.assertIsNotNone(receipt)
        self.assertEqual(receipt.amount, Decimal('50.00'))
        self.assertEqual(invoice.get_paid_amount(), Decimal('50.00'))
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.PARTIALLY_PAID)
    
    def test_add_payment_full_amount(self):
        """Test adding full payment amount."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal('100.00'),
            status=Invoice.Status.SENT
        )
        
        receipt = InvoiceService.add_payment(
            invoice,
            Decimal('100.00'),
            Receipt.PaymentMethod.CARD
        )
        
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.PAID)
        self.assertEqual(invoice.get_paid_amount(), Decimal('100.00'))
    
    def test_mark_as_paid(self):
        """Test marking invoice as paid."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal('100.00'),
            status=Invoice.Status.SENT
        )
        
        receipt = InvoiceService.mark_as_paid(
            invoice,
            Receipt.PaymentMethod.CASH
        )
        
        self.assertIsNotNone(receipt)
        self.assertEqual(receipt.amount, Decimal('100.00'))
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.PAID)
    
    def test_mark_as_paid_with_partial_payment(self):
        """Test marking as paid when partially paid."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal('100.00'),
            status=Invoice.Status.SENT
        )
        
        # Add partial payment
        InvoiceService.add_payment(
            invoice,
            Decimal('60.00'),
            Receipt.PaymentMethod.CASH
        )
        
        # Mark as paid (should create receipt for remaining)
        receipt = InvoiceService.mark_as_paid(
            invoice,
            Receipt.PaymentMethod.CARD
        )
        
        self.assertIsNotNone(receipt)
        self.assertEqual(receipt.amount, Decimal('40.00'))
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.PAID)
    
    def test_generate_invoice_number(self):
        """Test generating invoice number."""
        invoice_number = InvoiceService.generate_invoice_number(self.academy)
        self.assertTrue(invoice_number.startswith(f"INV-{self.academy.slug}-"))
        self.assertIn(str(timezone.now().year), invoice_number)
    
    def test_generate_invoice_number_sequential(self):
        """Test that invoice numbers are sequential."""
        # Create an invoice first to establish the sequence
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number=InvoiceService.generate_invoice_number(self.academy)
        )
        
        invoice1 = invoice.invoice_number
        invoice2 = InvoiceService.generate_invoice_number(self.academy)
        
        # Extract numbers
        num1 = int(invoice1.split('-')[-1])
        num2 = int(invoice2.split('-')[-1])
        
        self.assertEqual(num2, num1 + 1)
    
    def test_generate_receipt_number(self):
        """Test generating receipt number."""
        receipt_number = InvoiceService.generate_receipt_number(self.academy)
        self.assertTrue(receipt_number.startswith(f"RCP-{self.academy.slug}-"))
        self.assertIn(str(timezone.now().year), receipt_number)
    
    def test_generate_receipt_number_sequential(self):
        """Test that receipt numbers are sequential."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal('100.00')
        )
        
        receipt1 = InvoiceService.add_payment(
            invoice,
            Decimal('50.00'),
            Receipt.PaymentMethod.CASH
        )
        
        receipt2 = InvoiceService.add_payment(
            invoice,
            Decimal('50.00'),
            Receipt.PaymentMethod.CARD
        )
        
        # Extract numbers
        num1 = int(receipt1.receipt_number.split('-')[-1])
        num2 = int(receipt2.receipt_number.split('-')[-1])
        
        self.assertEqual(num2, num1 + 1)
