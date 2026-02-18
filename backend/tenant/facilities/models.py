"""Facilities and academy running cost models."""
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q, Sum
from django.utils import timezone

from saas_platform.tenants.models import Academy
from tenant.billing.models import Receipt
from tenant.onboarding.models import Location


class FacilityRentConfig(models.Model):
    """Default rent setup per location."""

    class PeriodType(models.TextChoices):
        DAY = 'DAY', 'Per Day'
        MONTH = 'MONTH', 'Per Month'
        SESSION = 'SESSION', 'Per Session'

    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='facility_rent_configs',
        db_index=True,
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name='facility_rent_configs',
        db_index=True,
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    currency = models.CharField(max_length=3, default='USD')
    period_type = models.CharField(
        max_length=20,
        choices=PeriodType.choices,
        default=PeriodType.MONTH,
        db_index=True,
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenant_facility_rent_configs'
        ordering = ['location__name', 'period_type']
        indexes = [
            models.Index(fields=['academy', 'location']),
            models.Index(fields=['academy', 'is_active']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['academy', 'location', 'period_type'],
                name='unique_facility_rent_config_per_period',
            )
        ]

    def __str__(self):
        return f"{self.location.name} - {self.period_type}"

    def clean(self):
        if self.location_id and self.academy_id and self.location.academy_id != self.academy_id:
            raise ValidationError({'location': 'Location must belong to the same academy.'})


class RentInvoice(models.Model):
    """Rent invoice for a facility/location."""

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        PENDING = 'PENDING', 'Pending'
        PAID = 'PAID', 'Paid'
        OVERDUE = 'OVERDUE', 'Overdue'
        CANCELLED = 'CANCELLED', 'Cancelled'

    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='rent_invoices',
        db_index=True,
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
        related_name='rent_invoices',
        db_index=True,
    )
    invoice_number = models.CharField(max_length=100, db_index=True)
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    currency = models.CharField(max_length=3, default='USD')
    period_description = models.CharField(max_length=255)
    issued_date = models.DateField(default=timezone.localdate)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenant_rent_invoices'
        ordering = ['-issued_date', '-created_at']
        indexes = [
            models.Index(fields=['academy', 'status']),
            models.Index(fields=['academy', 'location']),
            models.Index(fields=['academy', 'due_date']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['academy', 'invoice_number'],
                name='unique_rent_invoice_number_per_academy',
            )
        ]

    def __str__(self):
        return f"{self.invoice_number} - {self.location.name}"

    def clean(self):
        if self.location_id and self.academy_id and self.location.academy_id != self.academy_id:
            raise ValidationError({'location': 'Location must belong to the same academy.'})

    def get_paid_amount(self):
        paid = self.payments.aggregate(total=Sum('amount')).get('total')
        return paid or Decimal('0.00')

    def get_remaining_amount(self):
        remaining = self.amount - self.get_paid_amount()
        return remaining if remaining > Decimal('0.00') else Decimal('0.00')

    def update_status(self):
        if self.status == self.Status.CANCELLED:
            return

        paid_amount = self.get_paid_amount()
        today = timezone.now().date()

        if paid_amount >= self.amount:
            self.status = self.Status.PAID
            return

        if self.due_date and self.due_date < today:
            self.status = self.Status.OVERDUE
            return

        if self.status == self.Status.DRAFT and paid_amount == Decimal('0.00'):
            return

        self.status = self.Status.PENDING


class RentPayment(models.Model):
    """Payment against a rent invoice."""

    rent_invoice = models.ForeignKey(
        RentInvoice,
        on_delete=models.CASCADE,
        related_name='payments',
        db_index=True,
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    payment_date = models.DateField(default=timezone.localdate)
    payment_method = models.CharField(
        max_length=20,
        choices=Receipt.PaymentMethod.choices,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenant_rent_payments'
        ordering = ['-payment_date', '-created_at']
        indexes = [
            models.Index(fields=['rent_invoice', 'payment_date']),
        ]

    def __str__(self):
        return f"{self.rent_invoice.invoice_number} - {self.amount}"

    def clean(self):
        if self.rent_invoice.status == RentInvoice.Status.CANCELLED:
            raise ValidationError({'rent_invoice': 'Cannot add payment to a cancelled rent invoice.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        invoice = self.rent_invoice
        invoice.update_status()
        invoice.save(update_fields=['status', 'updated_at'])

    def delete(self, *args, **kwargs):
        invoice = self.rent_invoice
        super().delete(*args, **kwargs)
        invoice.update_status()
        invoice.save(update_fields=['status', 'updated_at'])


class RentReceipt(models.Model):
    """Receipt for a rent payment; one-to-one with RentPayment."""

    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='rent_receipts',
        db_index=True,
    )
    rent_invoice = models.ForeignKey(
        RentInvoice,
        on_delete=models.CASCADE,
        related_name='receipts',
        db_index=True,
    )
    rent_payment = models.OneToOneField(
        RentPayment,
        on_delete=models.CASCADE,
        related_name='receipt',
        db_index=True,
    )
    receipt_number = models.CharField(max_length=100, db_index=True)
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    payment_method = models.CharField(
        max_length=20,
        choices=Receipt.PaymentMethod.choices,
    )
    payment_date = models.DateField(default=timezone.localdate)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenant_rent_receipts'
        ordering = ['-payment_date', '-created_at']
        indexes = [
            models.Index(fields=['academy', 'receipt_number']),
            models.Index(fields=['academy', 'rent_invoice']),
            models.Index(fields=['academy', 'payment_date']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['academy', 'receipt_number'],
                name='unique_rent_receipt_number_per_academy',
            )
        ]

    def __str__(self):
        return f"{self.receipt_number} - {self.amount}"

    def clean(self):
        if self.rent_invoice_id and self.academy_id and self.rent_invoice.academy_id != self.academy_id:
            raise ValidationError({'rent_invoice': 'Rent invoice must belong to the same academy.'})
        if self.rent_payment_id and self.rent_invoice_id and self.rent_payment.rent_invoice_id != self.rent_invoice_id:
            raise ValidationError({'rent_payment': 'Rent payment must belong to the same rent invoice.'})


class Bill(models.Model):
    """Running cost bill."""

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PAID = 'PAID', 'Paid'
        OVERDUE = 'OVERDUE', 'Overdue'
        CANCELLED = 'CANCELLED', 'Cancelled'

    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='bills',
        db_index=True,
    )
    vendor_name = models.CharField(max_length=255)
    bill_number = models.CharField(max_length=100, blank=True, default='')
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    currency = models.CharField(max_length=3, default='USD')
    bill_date = models.DateField(default=timezone.localdate)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenant_bills'
        ordering = ['-bill_date', '-created_at']
        indexes = [
            models.Index(fields=['academy', 'status']),
            models.Index(fields=['academy', 'bill_date']),
            models.Index(fields=['academy', 'due_date']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['academy', 'bill_number'],
                condition=Q(bill_number__isnull=False) & ~Q(bill_number=''),
                name='unique_bill_number_per_academy_when_set',
            )
        ]

    def __str__(self):
        if self.bill_number:
            return f"{self.bill_number} - {self.vendor_name}"
        return f"Bill #{self.pk} - {self.vendor_name}"

    def recalculate_total(self):
        total = self.line_items.aggregate(total=Sum('line_total')).get('total')
        self.total_amount = total or Decimal('0.00')

    def update_status_for_due_date(self):
        if self.status != self.Status.PENDING:
            return
        today = timezone.now().date()
        if self.due_date and self.due_date < today:
            self.status = self.Status.OVERDUE

    def save(self, *args, **kwargs):
        self.full_clean()
        self.update_status_for_due_date()
        super().save(*args, **kwargs)


class InventoryItem(models.Model):
    """Inventory item owned by academy."""

    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='inventory_items',
        db_index=True,
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    quantity = models.PositiveIntegerField(default=0)
    unit = models.CharField(max_length=30, blank=True)
    reorder_level = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenant_inventory_items'
        ordering = ['name']
        indexes = [
            models.Index(fields=['academy', 'name']),
            models.Index(fields=['academy', 'quantity']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['academy', 'name'],
                name='unique_inventory_item_name_per_academy',
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.quantity})"


class BillLineItem(models.Model):
    """Line item for bills."""

    bill = models.ForeignKey(
        Bill,
        on_delete=models.CASCADE,
        related_name='line_items',
        db_index=True,
    )
    description = models.CharField(max_length=500)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    line_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    inventory_item = models.ForeignKey(
        InventoryItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bill_line_items',
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenant_bill_line_items'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['bill']),
            models.Index(fields=['inventory_item']),
        ]

    def __str__(self):
        return f"{self.description} ({self.quantity})"

    def clean(self):
        if self.inventory_item_id and self.inventory_item.academy_id != self.bill.academy_id:
            raise ValidationError({'inventory_item': 'Inventory item must belong to the same academy as the bill.'})

    def save(self, *args, **kwargs):
        unit_price = self.unit_price
        if not isinstance(unit_price, Decimal):
            unit_price = Decimal(str(unit_price))
        self.unit_price = unit_price
        self.line_total = Decimal(str(self.quantity)) * unit_price
        self.full_clean()
        super().save(*args, **kwargs)
