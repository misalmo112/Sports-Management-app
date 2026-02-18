"""
Admin configuration for billing models.
"""
from django.contrib import admin
from tenant.billing.models import Item, Invoice, InvoiceItem, Receipt


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
