"""Admin registrations for facilities models."""
from django.contrib import admin

from tenant.facilities.models import (
    Bill,
    BillLineItem,
    FacilityRentConfig,
    FacilitySessionCycle,
    InventoryItem,
    RentInvoice,
    RentPaySchedule,
    RentPayScheduleRun,
    RentPayment,
)


@admin.register(FacilityRentConfig)
class FacilityRentConfigAdmin(admin.ModelAdmin):
    list_display = ('location', 'academy', 'amount', 'currency', 'period_type', 'is_active')
    list_filter = ('academy', 'period_type', 'is_active')
    search_fields = ('location__name',)


class RentPaymentInline(admin.TabularInline):
    model = RentPayment
    extra = 0


@admin.register(RentInvoice)
class RentInvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'academy', 'location', 'amount', 'status', 'due_date')
    list_filter = ('academy', 'status', 'currency')
    search_fields = ('invoice_number', 'period_description', 'location__name')
    inlines = [RentPaymentInline]


@admin.register(RentPayment)
class RentPaymentAdmin(admin.ModelAdmin):
    list_display = ('rent_invoice', 'amount', 'payment_method', 'payment_date')
    list_filter = ('payment_method', 'payment_date')
    search_fields = ('rent_invoice__invoice_number',)


@admin.register(RentPaySchedule)
class RentPayScheduleAdmin(admin.ModelAdmin):
    list_display = ('location', 'billing_type', 'amount', 'is_active', 'last_run_at')
    list_filter = ('billing_type', 'is_active')


@admin.register(FacilitySessionCycle)
class FacilitySessionCycleAdmin(admin.ModelAdmin):
    list_display = ('schedule', 'cycle_number', 'sessions_counted', 'invoice')


@admin.register(RentPayScheduleRun)
class RentPayScheduleRunAdmin(admin.ModelAdmin):
    list_display = ('schedule', 'run_at', 'status', 'invoices_created', 'triggered_by')
    readonly_fields = (
        'schedule',
        'run_at',
        'invoices_created',
        'status',
        'triggered_by',
        'error_detail',
    )


class BillLineItemInline(admin.TabularInline):
    model = BillLineItem
    extra = 0


@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ('id', 'academy', 'vendor_name', 'bill_number', 'total_amount', 'status', 'bill_date')
    list_filter = ('academy', 'status', 'currency')
    search_fields = ('vendor_name', 'bill_number')
    inlines = [BillLineItemInline]


@admin.register(BillLineItem)
class BillLineItemAdmin(admin.ModelAdmin):
    list_display = ('bill', 'description', 'quantity', 'unit_price', 'line_total', 'inventory_item')
    list_filter = ('bill__academy',)
    search_fields = ('description',)


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'academy', 'quantity', 'unit', 'reorder_level')
    list_filter = ('academy',)
    search_fields = ('name',)
