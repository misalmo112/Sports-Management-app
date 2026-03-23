from django.contrib import admin

from tenant.coaches.models import (
    Coach,
    CoachPayScheme,
    StaffPaySchedule,
    CoachSessionCycle,
    StaffPayScheduleRun,
    StaffInvoice,
    CoachPayment,
    StaffReceipt,
)


@admin.register(Coach)
class CoachAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'academy', 'is_active', 'created_at']
    list_filter = ['academy', 'is_active']
    search_fields = ['first_name', 'last_name', 'email']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(CoachPayScheme)
class CoachPaySchemeAdmin(admin.ModelAdmin):
    list_display = ['coach', 'academy', 'period_type', 'amount', 'created_at']
    list_filter = ['academy', 'period_type']
    search_fields = ['coach__first_name', 'coach__last_name', 'coach__email']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(StaffPaySchedule)
class StaffPayScheduleAdmin(admin.ModelAdmin):
    list_display = ['coach', 'billing_type', 'amount', 'is_active', 'last_run_at']
    list_filter = ['billing_type', 'is_active']
    search_fields = ['coach__first_name', 'coach__last_name', 'coach__email']
    readonly_fields = ['created_at', 'updated_at', 'last_run_at']


@admin.register(CoachSessionCycle)
class CoachSessionCycleAdmin(admin.ModelAdmin):
    list_display = ['schedule', 'coach', 'cycle_number', 'sessions_counted', 'invoice']
    list_filter = ['schedule__billing_type']
    search_fields = ['coach__first_name', 'coach__last_name', 'coach__email']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(StaffPayScheduleRun)
class StaffPayScheduleRunAdmin(admin.ModelAdmin):
    list_display = ['schedule', 'run_at', 'status', 'invoices_created', 'triggered_by']
    readonly_fields = [field.name for field in StaffPayScheduleRun._meta.fields]


@admin.register(StaffInvoice)
class StaffInvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'coach', 'academy', 'amount', 'period_type', 'status', 'issued_date', 'schedule']
    list_filter = ['academy', 'status', 'period_type']
    search_fields = ['invoice_number', 'coach__first_name', 'coach__last_name', 'coach__email']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(CoachPayment)
class CoachPaymentAdmin(admin.ModelAdmin):
    list_display = ['coach', 'academy', 'period_type', 'period_start', 'amount', 'payment_date', 'payment_method']
    list_filter = ['academy', 'period_type', 'payment_method']
    search_fields = ['coach__first_name', 'coach__last_name', 'coach__email']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(StaffReceipt)
class StaffReceiptAdmin(admin.ModelAdmin):
    list_display = ['receipt_number', 'coach', 'academy', 'amount', 'payment_method', 'payment_date']
    list_filter = ['academy', 'payment_method']
    search_fields = ['receipt_number', 'coach__first_name', 'coach__last_name', 'coach__email']
    readonly_fields = ['created_at', 'updated_at']
