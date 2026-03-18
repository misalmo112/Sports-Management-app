"""
Billing services for invoice management.

Business logic for creating invoices, applying discounts, recording payments,
and generating invoice/receipt numbers.
"""
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from datetime import date
from tenant.billing.models import Invoice, InvoiceItem, Receipt, Item


class InvoiceService:
    """Service for invoice business logic."""
    
    @staticmethod
    @transaction.atomic
    def create_invoice(
        parent,
        items_data,
        discount_type=None,
        discount_value=None,
        due_date=None,
        issued_date=None,
        notes='',
        parent_invoice=None,
        sport=None,
        location=None
    ):
        """
        Create an invoice with items.
        
        Args:
            parent: Parent instance
            items_data: List of dicts with keys:
                - item_id (optional): ID of reusable Item
                - student_id (optional): ID of Student
                - description: Item description
                - quantity: Quantity (default 1)
                - unit_price: Unit price
            discount_type: 'PERCENTAGE' or 'FIXED' (optional)
            discount_value: Discount value (optional)
            due_date: Due date (optional)
            issued_date: Issued date (optional, defaults to today)
            notes: Invoice notes (optional)
            parent_invoice: Parent invoice for visibility (optional)
            sport: Sport instance (optional)
            location: Location instance (optional)
        
        Returns:
            Invoice instance
        
        Raises:
            ValidationError: If validation fails
        """
        academy = parent.academy
        
        # Validate discount
        if discount_type and not discount_value:
            raise ValidationError('Discount value is required when discount type is set.')
        if discount_type == Invoice.DiscountType.PERCENTAGE and discount_value:
            if discount_value > Decimal('100.00'):
                raise ValidationError('Percentage discount cannot exceed 100%.')
        
        # Generate invoice number
        invoice_number = InvoiceService.generate_invoice_number(academy)
        
        # Create invoice
        invoice = Invoice.objects.create(
            academy=academy,
            parent=parent,
            invoice_number=invoice_number,
            status=Invoice.Status.DRAFT,
            discount_type=discount_type,
            discount_value=discount_value,
            due_date=due_date,
            issued_date=issued_date or timezone.now().date(),
            notes=notes,
            parent_invoice=parent_invoice,
            sport=sport,
            location=location
        )
        
        # Create invoice items
        for item_data in items_data:
            item_id = item_data.get('item_id')
            student_id = item_data.get('student_id')
            description = item_data.get('description', '')
            quantity = item_data.get('quantity', 1)
            unit_price = item_data.get('unit_price')
            
            if not unit_price:
                raise ValidationError('unit_price is required for invoice items.')
            
            # Get item if provided
            item = None
            if item_id:
                try:
                    item = Item.objects.get(id=item_id, academy=academy)
                    if not description:
                        description = item.name
                    if not unit_price:
                        unit_price = item.price
                except Item.DoesNotExist:
                    raise ValidationError(f'Item with id {item_id} not found.')
            
            # Get student if provided
            student = None
            if student_id:
                from tenant.students.models import Student
                try:
                    student = Student.objects.get(id=student_id, academy=academy)
                except Student.DoesNotExist:
                    raise ValidationError(f'Student with id {student_id} not found.')
            
            # Create invoice item
            InvoiceItem.objects.create(
                invoice=invoice,
                item=item,
                student=student,
                description=description,
                quantity=quantity,
                unit_price=unit_price
            )
        
        # Recalculate totals
        invoice.calculate_totals()
        invoice.save(update_fields=['subtotal', 'discount_amount', 'total', 'updated_at'])
        
        return invoice
    
    @staticmethod
    @transaction.atomic
    def apply_discount(invoice, discount_type, discount_value):
        """
        Apply discount to an invoice.
        
        Args:
            invoice: Invoice instance
            discount_type: 'PERCENTAGE' or 'FIXED'
            discount_value: Discount value
        
        Returns:
            Invoice instance
        
        Raises:
            ValidationError: If validation fails
        """
        if invoice.status == Invoice.Status.PAID:
            raise ValidationError('Cannot apply discount to a paid invoice.')
        if invoice.status == Invoice.Status.CANCELLED:
            raise ValidationError('Cannot apply discount to a cancelled invoice.')
        
        if discount_type == Invoice.DiscountType.PERCENTAGE:
            if discount_value > Decimal('100.00'):
                raise ValidationError('Percentage discount cannot exceed 100%.')
        elif discount_type != Invoice.DiscountType.FIXED:
            raise ValidationError('Discount type must be PERCENTAGE or FIXED.')
        
        invoice.discount_type = discount_type
        invoice.discount_value = discount_value
        invoice.calculate_totals()
        # Save with all calculated fields
        invoice.save(update_fields=['discount_type', 'discount_value', 'subtotal', 'discount_amount', 'tax_amount', 'total', 'updated_at'])
        
        return invoice
    
    @staticmethod
    def calculate_totals(invoice):
        """
        Recalculate all invoice totals.
        
        Args:
            invoice: Invoice instance
        
        Returns:
            Invoice instance
        """
        invoice.calculate_totals()
        invoice.save(update_fields=['subtotal', 'discount_amount', 'total', 'updated_at'])
        return invoice
    
    @staticmethod
    @transaction.atomic
    def add_payment(invoice, amount, payment_method, payment_date=None, notes='', sport=None, location=None):
        """
        Record a payment (create receipt) for an invoice.
        
        Args:
            invoice: Invoice instance
            amount: Payment amount
            payment_method: Payment method (CASH, CHECK, CARD, etc.)
            payment_date: Payment date (defaults to today)
            notes: Payment notes (optional)
        
        Returns:
            Receipt instance
        
        Raises:
            ValidationError: If validation fails
        """
        if invoice.status == Invoice.Status.CANCELLED:
            raise ValidationError('Cannot add payment to a cancelled invoice.')
        
        if amount <= Decimal('0.00'):
            raise ValidationError('Payment amount must be greater than zero.')
        
        # Generate receipt number
        receipt_number = InvoiceService.generate_receipt_number(invoice.academy)
        
        # Default to invoice sport/location when not explicitly provided
        if sport is None:
            sport = invoice.sport
        if location is None:
            location = invoice.location

        # Create receipt
        receipt = Receipt.objects.create(
            academy=invoice.academy,
            invoice=invoice,
            receipt_number=receipt_number,
            amount=amount,
            payment_method=payment_method,
            payment_date=payment_date or timezone.now().date(),
            notes=notes,
            sport=sport,
            location=location
        )
        
        # Update invoice status
        invoice.update_status()
        invoice.save(update_fields=['status', 'updated_at'])
        
        return receipt
    
    @staticmethod
    @transaction.atomic
    def mark_as_paid(invoice, payment_method=None, payment_date=None, notes=''):
        """
        Mark invoice as fully paid (creates receipt if needed).
        
        Args:
            invoice: Invoice instance
            payment_method: Payment method (optional, if not provided, uses OTHER)
            payment_date: Payment date (optional, defaults to today)
            notes: Payment notes (optional)
        
        Returns:
            Receipt instance (if created) or None
        """
        remaining = invoice.get_remaining_balance()
        
        if remaining > Decimal('0.00'):
            # Create receipt for remaining balance
            receipt = InvoiceService.add_payment(
                invoice,
                remaining,
                payment_method or Receipt.PaymentMethod.OTHER,
                payment_date,
                notes
            )
            return receipt
        elif invoice.status != Invoice.Status.PAID:
            # Already paid, just update status
            invoice.update_status()
            invoice.save(update_fields=['status', 'updated_at'])
        return None
    
    @staticmethod
    def generate_invoice_number(academy):
        """
        Generate unique invoice number for an academy.
        
        Format: INV-{academy.slug}-{year}-{sequential_number}
        Example: INV-academy-1-2024-001
        
        Args:
            academy: Academy instance
        
        Returns:
            str: Invoice number
        """
        year = timezone.now().year
        prefix = f"INV-{academy.slug}-{year}-"
        
        # Get last invoice number for this academy and year
        last_invoice = Invoice.objects.filter(
            academy=academy,
            invoice_number__startswith=prefix
        ).order_by('-invoice_number').first()
        
        if last_invoice:
            # Extract number and increment
            try:
                last_num = int(last_invoice.invoice_number.split('-')[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1
        
        # Format with leading zeros
        invoice_number = f"{prefix}{next_num:03d}"
        
        return invoice_number
    
    @staticmethod
    def generate_receipt_number(academy):
        """
        Generate unique receipt number for an academy.
        
        Format: RCP-{academy.slug}-{year}-{sequential_number}
        Example: RCP-academy-1-2024-001
        
        Args:
            academy: Academy instance
        
        Returns:
            str: Receipt number
        """
        year = timezone.now().year
        prefix = f"RCP-{academy.slug}-{year}-"
        
        # Get last receipt number for this academy and year
        last_receipt = Receipt.objects.filter(
            academy=academy,
            receipt_number__startswith=prefix
        ).order_by('-receipt_number').first()
        
        if last_receipt:
            # Extract number and increment
            try:
                last_num = int(last_receipt.receipt_number.split('-')[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1
        
        # Format with leading zeros
        receipt_number = f"{prefix}{next_num:03d}"
        
        return receipt_number
