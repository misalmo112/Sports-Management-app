"""Notifications services (business logic).

Keep business logic out of views. Views should validate inputs via serializers and
delegate persistence and side-effects to this module.
"""

from __future__ import annotations

from django.shortcuts import get_object_or_404
from tenant.billing.models import Invoice, Receipt
from tenant.notifications.models import NotificationLog
from tenant.notifications.tasks import send_email_notification, send_whatsapp_notification


def resend_invoice_notifications(*, academy, invoice_id: int) -> Invoice:
    invoice = get_object_or_404(Invoice, id=invoice_id, academy=academy)
    # Fan-out tasks asynchronously and immediately.
    send_email_notification.delay("INVOICE", invoice.id)
    send_whatsapp_notification.delay("INVOICE", invoice.id)
    return invoice


def resend_receipt_notifications(*, academy, receipt_id: int) -> Receipt:
    receipt = get_object_or_404(Receipt, id=receipt_id, academy=academy)
    send_email_notification.delay("RECEIPT", receipt.id)
    send_whatsapp_notification.delay("RECEIPT", receipt.id)
    return receipt


def get_invoice_notification_logs(*, academy, invoice_id: int):
    # Validate the invoice belongs to this academy to keep tenant isolation strict.
    get_object_or_404(Invoice, id=invoice_id, academy=academy)
    return (
        NotificationLog.objects.filter(
            academy=academy,
            doc_type=NotificationLog.DocType.INVOICE,
            object_id=invoice_id,
        )
        .order_by("-sent_at")
    )


def get_receipt_notification_logs(*, academy, receipt_id: int):
    get_object_or_404(Receipt, id=receipt_id, academy=academy)
    return (
        NotificationLog.objects.filter(
            academy=academy,
            doc_type=NotificationLog.DocType.RECEIPT,
            object_id=receipt_id,
        )
        .order_by("-sent_at")
    )

