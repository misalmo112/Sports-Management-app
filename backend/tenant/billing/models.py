"""
Billing models for tenant layer.

Models for managing invoices, items, and receipts for academy billing.
"""
from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from saas_platform.tenants.models import Academy
from tenant.students.models import Parent, Student
from tenant.onboarding.models import Location, Sport


class Item(models.Model):
    """Reusable billing item (e.g., 'Monthly Class Fee', 'Equipment Fee')."""
    
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='billing_items',
        db_index=True
    )
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    currency = models.CharField(max_length=3, default='USD')
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_billing_items'
        indexes = [
            models.Index(fields=['academy', 'is_active']),
            models.Index(fields=['academy', 'name']),
        ]
        verbose_name = 'Billing Item'
        verbose_name_plural = 'Billing Items'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.academy.name})"


class Invoice(models.Model):
    """Invoice model for parent billing."""
    
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SENT = 'SENT', 'Sent'
        PARTIALLY_PAID = 'PARTIALLY_PAID', 'Partially Paid'
        PAID = 'PAID', 'Paid'
        OVERDUE = 'OVERDUE', 'Overdue'
        CANCELLED = 'CANCELLED', 'Cancelled'
    
    class DiscountType(models.TextChoices):
        PERCENTAGE = 'PERCENTAGE', 'Percentage'
        FIXED = 'FIXED', 'Fixed Amount'
    
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='invoices',
        db_index=True
    )
    
    parent = models.ForeignKey(
        Parent,
        on_delete=models.CASCADE,
        related_name='invoices',
        db_index=True
    )
    
    # Invoice number (unique per academy)
    invoice_number = models.CharField(max_length=100, unique=False, db_index=True)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True
    )
    
    # Financial fields
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(0)]
    )
    discount_type = models.CharField(
        max_length=20,
        choices=DiscountType.choices,
        null=True,
        blank=True
    )
    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)]
    )
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(0)]
    )
    tax_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(0)]
    )
    total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(0)]
    )
    
    # Dates
    due_date = models.DateField(null=True, blank=True)
    issued_date = models.DateField(null=True, blank=True)
    
    # Parent invoice visibility (self-referential)
    parent_invoice = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='child_invoices',
        help_text='Link to parent invoice for visibility grouping'
    )
    
    # Sport and Location
    sport = models.ForeignKey(
        Sport,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices',
        db_index=True
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices',
        db_index=True
    )
    
    # Notes
    notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_invoices'
        indexes = [
            models.Index(fields=['academy', 'status']),
            models.Index(fields=['academy', 'parent']),
            models.Index(fields=['academy', 'invoice_number']),
            models.Index(fields=['academy', 'due_date']),
            models.Index(fields=['parent', 'status']),
            models.Index(fields=['academy', 'sport']),
            models.Index(fields=['academy', 'location']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['academy', 'invoice_number'],
                name='unique_invoice_number_per_academy'
            )
        ]
        verbose_name = 'Invoice'
        verbose_name_plural = 'Invoices'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.invoice_number} - {self.parent.full_name}"
    
    def clean(self):
        """Validate invoice data."""
        if self.discount_type and not self.discount_value:
            raise ValidationError({
                'discount_value': 'Discount value is required when discount type is set.'
            })
        if self.discount_type == self.DiscountType.PERCENTAGE and self.discount_value:
            if self.discount_value > Decimal('100.00'):
                raise ValidationError({
                    'discount_value': 'Percentage discount cannot exceed 100%.'
                })
        if self.sport and self.academy:
            if self.sport.academy_id != self.academy_id:
                raise ValidationError({
                    'sport': 'Sport must belong to the same academy as the invoice.'
                })
        if self.location and self.academy:
            if self.location.academy_id != self.academy_id:
                raise ValidationError({
                    'location': 'Location must belong to the same academy as the invoice.'
                })
    
    def save(self, *args, **kwargs):
        """Override save to validate and calculate totals."""
        self.full_clean()
        # Save first to get pk if needed
        is_new = self.pk is None
        super().save(*args, **kwargs)
        # Calculate totals after save (now we have pk)
        if is_new or 'update_fields' not in kwargs or any(f in kwargs.get('update_fields', []) for f in ['subtotal', 'discount_amount', 'total', 'tax_amount', 'discount_type', 'discount_value']):
            self.calculate_totals()
            # Save again to persist calculated totals, but avoid recursion
            update_fields = kwargs.get('update_fields')
            if update_fields is None:
                super().save(update_fields=['subtotal', 'discount_amount', 'total', 'updated_at'])
            elif any(f in update_fields for f in ['subtotal', 'discount_amount', 'total']):
                # Already updating these fields, no need to save again
                pass
    
    def calculate_totals(self):
        """Calculate invoice totals from items."""
        # Only calculate if invoice has been saved
        if not self.pk:
            return
        # Calculate subtotal from items (only if items exist, otherwise keep existing subtotal)
        items_total = sum(item.line_total for item in self.items.all())
        if items_total > Decimal('0.00') or self.items.exists():
            # Items exist, recalculate subtotal from items
            self.subtotal = items_total
        # If no items, preserve manually set subtotal or infer from total
        elif not self.items.exists():
            # If subtotal is 0 but total is set, infer subtotal from total
            # Formula: total = subtotal - discount_amount + tax_amount
            # So: subtotal = total + discount_amount - tax_amount
            if self.subtotal == Decimal('0.00') and self.total > Decimal('0.00'):
                # Infer subtotal from total, discount, and tax
                self.subtotal = (self.total + self.discount_amount - self.tax_amount).quantize(Decimal('0.01'))
            # Otherwise, keep existing subtotal (for invoices created with manual subtotal)
        
        # Calculate discount
        if self.discount_type and self.discount_value:
            # Recalculate discount from type/value
            if self.discount_type == self.DiscountType.PERCENTAGE:
                self.discount_amount = (self.subtotal * (self.discount_value / Decimal('100.00'))).quantize(Decimal('0.01'))
            else:  # FIXED
                self.discount_amount = min(self.discount_value, self.subtotal)
        else:
            # If discount_type/discount_value are not set, preserve manually set discount_amount
            # Don't overwrite it - just keep the existing value
            # (This allows invoices to be created with manual discount_amount without discount_type/value)
            pass  # Preserve existing discount_amount value
        
        # Calculate total (subtotal - discount + tax)
        self.total = (self.subtotal - self.discount_amount + self.tax_amount).quantize(Decimal('0.01'))
        
        # Ensure total is not negative
        if self.total < Decimal('0.00'):
            self.total = Decimal('0.00')
    
    def get_paid_amount(self):
        """Get total amount paid via receipts."""
        return sum(receipt.amount for receipt in self.receipts.all()) or Decimal('0.00')
    
    def get_remaining_balance(self):
        """Get remaining balance after payments."""
        return self.total - self.get_paid_amount()
    
    def update_status(self):
        """Update invoice status based on payments and due date."""
        paid_amount = self.get_paid_amount()
        
        if self.status == self.Status.CANCELLED:
            return  # Don't update cancelled invoices
        
        # Check payment status only if total > 0 (avoid division by zero logic issues)
        if self.total > Decimal('0.00'):
            if paid_amount >= self.total:
                self.status = self.Status.PAID
            elif paid_amount > Decimal('0.00'):
                self.status = self.Status.PARTIALLY_PAID
            elif self.status == self.Status.DRAFT:
                return  # Keep draft status
            elif self.due_date and self.due_date < timezone.now().date():
                if self.status not in [self.Status.PAID, self.Status.PARTIALLY_PAID]:
                    self.status = self.Status.OVERDUE
            elif self.status == self.Status.SENT:
                return  # Keep sent status
        else:
            # Total is 0 - check for overdue first, then payment status
            if self.status == self.Status.DRAFT:
                return  # Keep draft status
            elif self.due_date and self.due_date < timezone.now().date():
                if self.status not in [self.Status.PAID, self.Status.PARTIALLY_PAID]:
                    self.status = self.Status.OVERDUE
            elif paid_amount > Decimal('0.00'):
                # If total is 0 but payments exist, mark as paid
                self.status = self.Status.PAID
            elif self.status == self.Status.SENT:
                return  # Keep sent status


class InvoiceItem(models.Model):
    """Line item on an invoice."""
    
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='items',
        db_index=True
    )
    
    # Optional link to reusable item
    item = models.ForeignKey(
        Item,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice_items'
    )
    
    # Optional link to student
    student = models.ForeignKey(
        Student,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice_items'
    )
    
    # Item details (can be custom if item is None)
    description = models.CharField(max_length=500)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    line_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_invoice_items'
        indexes = [
            models.Index(fields=['invoice']),
            models.Index(fields=['item']),
            models.Index(fields=['student']),
        ]
        verbose_name = 'Invoice Item'
        verbose_name_plural = 'Invoice Items'
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.description} - {self.invoice.invoice_number}"
    
    def clean(self):
        """Validate invoice item."""
        if self.invoice and self.student:
            if self.invoice.academy_id != self.student.academy_id:
                raise ValidationError({
                    'student': 'Student must belong to the same academy as the invoice.'
                })
        if self.invoice and self.item:
            if self.invoice.academy_id != self.item.academy_id:
                raise ValidationError({
                    'item': 'Item must belong to the same academy as the invoice.'
                })
    
    def save(self, *args, **kwargs):
        """Override save to calculate line total."""
        # Calculate line total before validation, normalize unit_price to Decimal
        unit_price = self.unit_price
        if not isinstance(unit_price, Decimal):
            unit_price = Decimal(str(unit_price))
        self.line_total = Decimal(str(self.quantity)) * unit_price
        self.unit_price = unit_price
        self.full_clean()
        super().save(*args, **kwargs)
        # Recalculate invoice totals
        if self.invoice and self.invoice.pk:
            self.invoice.calculate_totals()
            self.invoice.save(update_fields=['subtotal', 'discount_amount', 'total', 'updated_at'])


class Receipt(models.Model):
    """Payment receipt linked to an invoice."""
    
    class PaymentMethod(models.TextChoices):
        CASH = 'CASH', 'Cash'
        CHECK = 'CHECK', 'Check'
        CARD = 'CARD', 'Card'
        BANK_TRANSFER = 'BANK_TRANSFER', 'Bank Transfer'
        OTHER = 'OTHER', 'Other'
    
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='receipts',
        db_index=True
    )
    
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='receipts',
        db_index=True
    )
    
    # Receipt number (unique per academy)
    receipt_number = models.CharField(max_length=100, unique=False, db_index=True)
    
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices
    )
    payment_date = models.DateField(default=timezone.now)
    
    # Sport and Location
    sport = models.ForeignKey(
        Sport,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='receipts',
        db_index=True
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='receipts',
        db_index=True
    )
    
    notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_receipts'
        indexes = [
            models.Index(fields=['academy', 'receipt_number']),
            models.Index(fields=['academy', 'invoice']),
            models.Index(fields=['academy', 'payment_date']),
            models.Index(fields=['invoice', 'payment_date']),
            models.Index(fields=['academy', 'sport']),
            models.Index(fields=['academy', 'location']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['academy', 'receipt_number'],
                name='unique_receipt_number_per_academy'
            )
        ]
        verbose_name = 'Receipt'
        verbose_name_plural = 'Receipts'
        ordering = ['-payment_date', '-created_at']
    
    def __str__(self):
        return f"{self.receipt_number} - {self.amount}"
    
    def clean(self):
        """Validate receipt."""
        if self.invoice and self.academy:
            if self.invoice.academy_id != self.academy_id:
                raise ValidationError({
                    'invoice': 'Invoice must belong to the same academy as the receipt.'
                })
        if self.sport and self.academy:
            if self.sport.academy_id != self.academy_id:
                raise ValidationError({
                    'sport': 'Sport must belong to the same academy as the receipt.'
                })
        if self.location and self.academy:
            if self.location.academy_id != self.academy_id:
                raise ValidationError({
                    'location': 'Location must belong to the same academy as the receipt.'
                })
    
    def save(self, *args, **kwargs):
        """Override save to update invoice status."""
        self.full_clean()
        super().save(*args, **kwargs)
        # Update invoice status after payment
        if self.invoice:
            self.invoice.update_status()
            self.invoice.save(update_fields=['status', 'updated_at'])
