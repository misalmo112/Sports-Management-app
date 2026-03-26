"""Notifications signals for tenant billing documents.

These receivers translate billing events (invoice/receipt) into async Celery tasks.
"""

from __future__ import annotations

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from tenant.billing.models import Invoice, Receipt
from tenant.notifications.tasks import send_email_notification, send_whatsapp_notification


@receiver(pre_save, sender=Invoice)
def invoice_pre_save_capture_previous_status(sender, instance: Invoice, **_kwargs):
    """Capture previous invoice.status to avoid duplicate notification sends."""
    previous_status = None
    if instance.pk:
        try:
            previous_status = Invoice.objects.get(pk=instance.pk).status
        except Invoice.DoesNotExist:
            previous_status = None

    # Used by post_save to determine whether we transitioned to SENT.
    instance._previous_status = previous_status


@receiver(post_save, sender=Invoice)
def invoice_post_save_send_notifications(sender, instance: Invoice, created: bool, **_kwargs):
    # Only send on transitions (DRAFT -> SENT, PARTIALLY_PAID -> SENT, etc.).
    # If an invoice is created already in SENT state, there is no "previous DB status"
    # captured in pre_save, so we intentionally skip it to prevent early fan-out.
    if created:
        return

    previous_status = getattr(instance, "_previous_status", None)

    # Fire only when we transition into SENT (and not on repeated saves).
    if instance.status == Invoice.Status.SENT and previous_status != Invoice.Status.SENT:
        send_email_notification.delay("INVOICE", instance.id)
        send_whatsapp_notification.delay("INVOICE", instance.id)


@receiver(post_save, sender=Receipt)
def receipt_post_save_send_notifications(sender, instance: Receipt, created: bool, **_kwargs):
    # Fire only on creation; updating an existing receipt is not a "new notification event".
    if created:
        send_email_notification.delay("RECEIPT", instance.id)
        send_whatsapp_notification.delay("RECEIPT", instance.id)

