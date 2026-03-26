from django.contrib import admin

from tenant.notifications.models import NotificationLog


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ['academy', 'channel', 'doc_type', 'object_id', 'status', 'sent_at']
    list_filter = ['channel', 'doc_type', 'status', 'sent_at']
    search_fields = ['wa_message_id', 'error_detail', 'recipient_email', 'recipient_phone']
    readonly_fields = ['sent_at']

