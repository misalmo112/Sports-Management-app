"""
Admin configuration for billing models.
"""
from django.contrib import admin
from tenant.billing.models import (
    Item,
    Invoice,
    InvoiceItem,
    InvoiceSchedule,
    InvoiceScheduleRun,
    StudentInvoiceCycle,
    StudentScheduleOverride,
    Receipt,
)


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    """Admin for Item model."""
    list_display = ['name', 'price', 'currency', 'is_active', 'academy', 'created_at']
    list_filter = ['is_active', 'currency', 'academy']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']


class InvoiceItemInline(admin.TabularInline):
    """Inline admin for InvoiceItem."""
    model = InvoiceItem
    extra = 0
    readonly_fields = ['line_total', 'created_at', 'updated_at']


class ReceiptInline(admin.TabularInline):
    """Inline admin for Receipt."""
    model = Receipt
    extra = 0
    readonly_fields = ['receipt_number', 'created_at', 'updated_at']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    """Admin for Invoice model."""
    list_display = [
        'invoice_number', 'parent', 'status', 'total', 'paid_amount_display',
        'remaining_balance_display', 'due_date', 'academy', 'created_at'
    ]
    list_filter = ['status', 'discount_type', 'academy', 'due_date']
    search_fields = ['invoice_number', 'parent__first_name', 'parent__last_name', 'parent__email']
    readonly_fields = [
        'invoice_number', 'subtotal', 'discount_amount', 'total',
        'paid_amount_display', 'remaining_balance_display', 'created_at', 'updated_at'
    ]
    inlines = [InvoiceItemInline, ReceiptInline]
    
    def paid_amount_display(self, obj):
        """Display paid amount."""
        return obj.get_paid_amount()
    paid_amount_display.short_description = 'Paid Amount'
    
    def remaining_balance_display(self, obj):
        """Display remaining balance."""
        return obj.get_remaining_balance()
    remaining_balance_display.short_description = 'Remaining Balance'


@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    """Admin for InvoiceItem model."""
    list_display = ['invoice', 'description', 'quantity', 'unit_price', 'line_total', 'student']
    list_filter = ['invoice__academy', 'invoice']
    search_fields = ['description', 'invoice__invoice_number']
    readonly_fields = ['line_total', 'created_at', 'updated_at']


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    """Admin for Receipt model."""
    list_display = [
        'receipt_number', 'invoice', 'amount', 'payment_method',
        'payment_date', 'academy', 'created_at'
    ]
    list_filter = ['payment_method', 'academy', 'payment_date']
    search_fields = ['receipt_number', 'invoice__invoice_number']
    readonly_fields = ['receipt_number', 'created_at', 'updated_at']


class StudentScheduleOverrideInline(admin.TabularInline):
    """Inline admin for StudentScheduleOverride."""
    model = StudentScheduleOverride
    extra = 0


@admin.register(StudentScheduleOverride)
class StudentScheduleOverrideAdmin(admin.ModelAdmin):
    """Admin for StudentScheduleOverride."""
    list_display = ['schedule', 'student', 'discount_type', 'discount_value']
    list_filter = ['discount_type', 'schedule__billing_type']
    search_fields = ['student__first_name', 'student__last_name']
    readonly_fields = []


@admin.register(InvoiceSchedule)
class InvoiceScheduleAdmin(admin.ModelAdmin):
    """Admin for InvoiceSchedule."""
    list_display = ['class_obj', 'billing_type', 'invoice_creation_timing', 'is_active', 'last_run_at']
    list_filter = ['billing_type', 'is_active', 'class_obj__academy']
    search_fields = ['class_obj__name']
    inlines = [StudentScheduleOverrideInline]


@admin.register(StudentInvoiceCycle)
class StudentInvoiceCycleAdmin(admin.ModelAdmin):
    """Admin for StudentInvoiceCycle."""
    list_display = ['schedule', 'student', 'cycle_number', 'sessions_counted', 'invoice']
    list_filter = ['schedule__billing_type', 'schedule__class_obj__academy']
    search_fields = ['student__first_name', 'student__last_name']


@admin.register(InvoiceScheduleRun)
class InvoiceScheduleRunAdmin(admin.ModelAdmin):
    """Admin for InvoiceScheduleRun (audit record)."""
    list_display = ['schedule', 'run_at', 'status', 'invoices_created', 'triggered_by']
    read_only_fields = ['schedule', 'run_at', 'status', 'invoices_created', 'triggered_by', 'error_detail']

    def get_readonly_fields(self, request, obj=None):
        # Keep audit intent (read-only fields) while still allowing creation
        # via the add view by making fields editable when `obj` is None.
        if obj is None:
            return []
        return self.read_only_fields
