from django.db import models

from saas_platform.tenants.models import Academy


class NotificationLog(models.Model):
    class Channel(models.TextChoices):
        EMAIL = 'EMAIL', 'Email'
        WHATSAPP = 'WHATSAPP', 'WhatsApp'

    class DocType(models.TextChoices):
        INVOICE = 'INVOICE', 'Invoice'
        RECEIPT = 'RECEIPT', 'Receipt'

    class Status(models.TextChoices):
        SENT = 'SENT', 'Sent'
        FAILED = 'FAILED', 'Failed'
        SKIPPED = 'SKIPPED', 'Skipped'

    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='notification_logs',
        db_index=True,
    )
    channel = models.CharField(max_length=16, choices=Channel.choices, db_index=True)
    doc_type = models.CharField(max_length=16, choices=DocType.choices, db_index=True)
    object_id = models.PositiveIntegerField()

    recipient_email = models.EmailField(blank=True)
    recipient_phone = models.CharField(max_length=32, blank=True)

    status = models.CharField(max_length=16, choices=Status.choices, db_index=True)
    wa_message_id = models.CharField(max_length=128, blank=True)
    error_detail = models.TextField(blank=True)

    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tenant_notification_logs'
        indexes = [
            models.Index(fields=['academy', 'channel', 'status']),
            models.Index(fields=['doc_type', 'object_id']),
        ]
        ordering = ['-sent_at']

    def __str__(self):
        return f"NotificationLog({self.channel}, {self.doc_type}, {self.object_id}, {self.status})"

