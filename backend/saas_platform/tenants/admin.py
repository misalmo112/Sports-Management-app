from django.contrib import admin

from saas_platform.tenants.models import AcademyWhatsAppConfig


@admin.register(AcademyWhatsAppConfig)
class AcademyWhatsAppConfigAdmin(admin.ModelAdmin):
    list_display = [
        'academy',
        'is_enabled',
        'verified',
        'phone_number_id',
        'waba_id',
        'configured_at',
        'created_at',
    ]
    list_filter = ['is_enabled', 'verified', 'configured_at', 'created_at']
    search_fields = ['academy__name', 'phone_number_id', 'waba_id']
    readonly_fields = ['configured_at', 'created_at']

