from __future__ import annotations

try:
    from celery import shared_task
except ModuleNotFoundError:  # pragma: no cover
    # Celery is optional in some test environments; make tasks importable.
    def shared_task(func=None, **_kwargs):
        if func is None:
            def decorator(f):
                def _delay(*args, **kwargs):
                    return f(*args, **kwargs)

                f.delay = _delay
                return f

            return decorator

        def _delay(*args, **kwargs):
            return func(*args, **kwargs)

        func.delay = _delay
        return func

from tenant.notifications.email_service import EmailNotificationService
from tenant.notifications.whatsapp_service import (
    WhatsAppDispatchRetryableError,
    WhatsAppDispatchHTTPError,
    WhatsAppNotificationService,
)
from saas_platform.tenants.models import Academy
from tenant.notifications.models import NotificationLog


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_notification(self, doc_type: str, object_id: int):
    """
    Fan-out email dispatch for invoice/receipt documents.

    Retry policy: exponential backoff 60s, 120s, 240s (max 3 retries).
    """

    try:
        if doc_type == "INVOICE":
            EmailNotificationService.send_invoice_email(object_id)
        elif doc_type == "RECEIPT":
            EmailNotificationService.send_receipt_email(object_id)
        else:
            raise ValueError(f"Unsupported doc_type={doc_type}")
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60 * (2**self.request.retries))


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_whatsapp_notification(self, doc_type: str, object_id: int):
    """
    Fan-out WhatsApp dispatch for invoice/receipt documents.

    Retry policy:
    - HTTP 4xx must NOT retry (service returns after logging).
    - HTTP 5xx retries with exponential backoff: 60s, 120s, 240s.
    """

    try:
        if doc_type == "INVOICE":
            WhatsAppNotificationService.send_invoice_whatsapp(object_id)
        elif doc_type == "RECEIPT":
            WhatsAppNotificationService.send_receipt_whatsapp(object_id)
        else:
            raise ValueError(f"Unsupported doc_type={doc_type}")
    except WhatsAppDispatchRetryableError as exc:
        raise self.retry(exc=exc, countdown=60 * (2**self.request.retries))


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_whatsapp_test_notification(self, academy_id: str, phone_number: str):
    """
    Send a test WhatsApp template message for a platform-configured academy.

    Logs delivery outcome into `NotificationLog` so it can be shown in the
    superadmin notification log viewer.
    """

    academy = Academy.objects.get(id=academy_id)
    config = WhatsAppNotificationService._get_config(academy)

    # Keep log shape consistent with invoice/receipt dispatches.
    doc_type = NotificationLog.DocType.INVOICE
    object_id = 0

    if not config or config.is_enabled is False:
        WhatsAppNotificationService._log(
            academy=academy,
            doc_type=doc_type,
            object_id=object_id,
            recipient_phone=phone_number,
            status=NotificationLog.Status.SKIPPED,
        )
        return

    # Build conservative dummy components; actual templates might vary.
    currency = getattr(academy, "currency", "USD") or "USD"
    total_str = f"0 {currency}"
    components = [
        {
            "type": "header",
            "parameters": [
                {
                    "type": "document",
                    "document": {"link": "https://example.com/test.pdf"},
                },
            ],
        },
        {
            "type": "body",
            "parameters": [
                {"type": "text", "text": "Test User"},
                {"type": "text", "text": "TEST-001"},
                {"type": "text", "text": getattr(academy, "name", "") or "Academy"},
                {"type": "text", "text": total_str},
                {"type": "text", "text": ""},
            ],
        },
    ]

    access_token = WhatsAppNotificationService._decrypt_token(config)
    try:
        wa_message_id = WhatsAppNotificationService._send_template_message(
            phone_number_id=config.phone_number_id,
            access_token=access_token,
            to_phone=phone_number,
            template_name=config.invoice_template_name,
            language=config.template_language,
            components=components,
        )
    except WhatsAppDispatchRetryableError as exc:
        raise self.retry(exc=exc, countdown=60 * (2**self.request.retries))
    except WhatsAppDispatchHTTPError as exc:
        WhatsAppNotificationService._log(
            academy=academy,
            doc_type=doc_type,
            object_id=object_id,
            recipient_phone=phone_number,
            status=NotificationLog.Status.FAILED,
            error_detail=exc.error_detail or "",
        )
        return
    except Exception as exc:  # pragma: no cover
        # If we don't know the error type, record failure.
        WhatsAppNotificationService._log(
            academy=academy,
            doc_type=doc_type,
            object_id=object_id,
            recipient_phone=phone_number,
            status=NotificationLog.Status.FAILED,
            error_detail=str(exc),
        )
        return

    WhatsAppNotificationService._log(
        academy=academy,
        doc_type=doc_type,
        object_id=object_id,
        recipient_phone=phone_number,
        status=NotificationLog.Status.SENT,
        wa_message_id=wa_message_id,
    )

