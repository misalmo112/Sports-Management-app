from __future__ import annotations

import logging
import requests

from saas_platform.tenants.models import AcademyWhatsAppConfig
from tenant.billing.models import Invoice, Receipt
from tenant.notifications.models import NotificationLog
from tenant.notifications.pdf_service import PDFService
from shared.utils.encryption import decrypt_value
from shared.utils.phone import normalize_to_e164

logger = logging.getLogger(__name__)


class WhatsAppDispatchHTTPError(Exception):
    def __init__(self, status_code: int, error_detail: str):
        self.status_code = status_code
        self.error_detail = error_detail
        super().__init__(f"WhatsApp dispatch failed with status_code={status_code}")


class WhatsAppDispatchRetryableError(WhatsAppDispatchHTTPError):
    pass


class WhatsAppNotificationService:
    """
    Dispatch branded WhatsApp template messages for tenant billing documents.

    SECURITY:
    - Decrypted WhatsApp access tokens MUST NEVER appear in logs or NotificationLog.error_detail.
    """

    @staticmethod
    def _log(
        academy,
        doc_type: str,
        object_id: int,
        recipient_phone: str,
        status: str,
        *,
        wa_message_id: str = "",
        error_detail: str = "",
    ) -> None:
        NotificationLog.objects.create(
            academy=academy,
            channel=NotificationLog.Channel.WHATSAPP,
            doc_type=doc_type,
            object_id=object_id,
            recipient_email="",
            recipient_phone=recipient_phone or "",
            status=status,
            wa_message_id=wa_message_id or "",
            error_detail=error_detail or "",
        )

    @staticmethod
    def _get_config(academy) -> AcademyWhatsAppConfig | None:
        return AcademyWhatsAppConfig.objects.filter(academy=academy).first()

    @staticmethod
    def _decrypt_token(config: AcademyWhatsAppConfig) -> str:
        return decrypt_value(getattr(config, "access_token_encrypted", "") or "")

    @staticmethod
    def _send_template_message(
        phone_number_id: str,
        access_token: str,
        to_phone: str,
        template_name: str,
        language: str,
        components: list,
    ) -> str:
        url = f"https://graph.facebook.com/v17.0/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        payload = {
            "messaging_product": "whatsapp",
            "to": to_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language},
                "components": components,
            },
        }

        resp = requests.post(url, headers=headers, json=payload, timeout=20)

        if resp.status_code >= 400:
            # Ensure decrypted access token never reaches logs or NotificationLog.error_detail.
            raw_detail = resp.text or ""
            if access_token and raw_detail and access_token in raw_detail:
                raw_detail = raw_detail.replace(access_token, "[REDACTED]")

            error_detail = f"HTTP {resp.status_code}: {raw_detail}".strip()
            if resp.status_code >= 500:
                raise WhatsAppDispatchRetryableError(resp.status_code, error_detail)
            raise WhatsAppDispatchHTTPError(resp.status_code, error_detail)

        data = resp.json()
        messages = data.get("messages") or []
        if not messages:
            raise WhatsAppDispatchHTTPError(resp.status_code, "WhatsApp API returned no message id")

        message_id = messages[0].get("id") or messages[0].get("message_id")
        if not message_id:
            raise WhatsAppDispatchHTTPError(resp.status_code, "WhatsApp API returned empty message id")

        return str(message_id)

    @staticmethod
    def _build_invoice_components(invoice: Invoice, pdf_url: str) -> list:
        currency = getattr(invoice.academy, "currency", "USD") or "USD"
        total = getattr(invoice, "total", None)
        total_str = f"{total} {currency}" if total is not None else f"0 {currency}"
        due_date = str(invoice.due_date) if invoice.due_date else ""

        return [
            {
                "type": "header",
                "parameters": [
                    {"type": "document", "document": {"link": pdf_url}},
                ],
            },
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": invoice.parent.full_name},
                    {"type": "text", "text": invoice.invoice_number},
                    {"type": "text", "text": invoice.academy.name},
                    {"type": "text", "text": total_str},
                    {"type": "text", "text": due_date},
                ],
            },
        ]

    @staticmethod
    def _build_receipt_components(receipt: Receipt, pdf_url: str) -> list:
        currency = getattr(receipt.academy, "currency", "USD") or "USD"
        amount = getattr(receipt, "amount", None)
        amount_str = f"{amount} {currency}" if amount is not None else f"0 {currency}"
        payment_date = str(getattr(receipt, "payment_date", "") or "")

        return [
            {
                "type": "header",
                "parameters": [
                    {"type": "document", "document": {"link": pdf_url}},
                ],
            },
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": receipt.invoice.parent.full_name},
                    {"type": "text", "text": receipt.receipt_number},
                    {"type": "text", "text": receipt.academy.name},
                    {"type": "text", "text": amount_str},
                    {"type": "text", "text": payment_date},
                ],
            },
        ]

    @staticmethod
    def send_invoice_whatsapp(invoice_id: int) -> None:
        invoice = (
            Invoice.objects.select_related("academy", "parent")
            .prefetch_related("items__student")
            .get(pk=invoice_id)
        )
        academy = invoice.academy
        parent = invoice.parent

        config = WhatsAppNotificationService._get_config(academy)
        # Guard order (required):
        if not config or config.is_enabled is False:
            WhatsAppNotificationService._log(
                academy=academy,
                doc_type=NotificationLog.DocType.INVOICE,
                object_id=invoice_id,
                recipient_phone="",
                status=NotificationLog.Status.SKIPPED,
            )
            return

        if config.send_on_invoice_created is False:
            WhatsAppNotificationService._log(
                academy=academy,
                doc_type=NotificationLog.DocType.INVOICE,
                object_id=invoice_id,
                recipient_phone="",
                status=NotificationLog.Status.SKIPPED,
            )
            return

        raw_phone = getattr(parent, "phone", "") or ""
        normalized_phone = normalize_to_e164(raw_phone, academy_country=getattr(academy, "country", "") or "ARE")
        if normalized_phone is None:
            WhatsAppNotificationService._log(
                academy=academy,
                doc_type=NotificationLog.DocType.INVOICE,
                object_id=invoice_id,
                recipient_phone="",
                status=NotificationLog.Status.FAILED,
                error_detail="Phone could not be normalized to E.164",
            )
            return

        # Generate/retrieve PDF -> get presigned URL (15 min TTL)
        pdf_service = PDFService()
        s3_key = pdf_service.generate_invoice_pdf(invoice_id)
        pdf_url = pdf_service.get_presigned_url(s3_key, expiry_seconds=900)

        access_token = WhatsAppNotificationService._decrypt_token(config)
        try:
            wa_message_id = WhatsAppNotificationService._send_template_message(
                phone_number_id=config.phone_number_id,
                access_token=access_token,
                to_phone=normalized_phone,
                template_name=config.invoice_template_name,
                language=config.template_language,
                components=WhatsAppNotificationService._build_invoice_components(invoice, pdf_url),
            )
        except WhatsAppDispatchHTTPError as exc:
            WhatsAppNotificationService._log(
                academy=academy,
                doc_type=NotificationLog.DocType.INVOICE,
                object_id=invoice_id,
                recipient_phone=normalized_phone,
                status=NotificationLog.Status.FAILED,
                error_detail=exc.error_detail or "",
            )
            # HTTP 4xx must not trigger Celery retry.
            if exc.status_code < 500:
                return
            raise

        WhatsAppNotificationService._log(
            academy=academy,
            doc_type=NotificationLog.DocType.INVOICE,
            object_id=invoice_id,
            recipient_phone=normalized_phone,
            status=NotificationLog.Status.SENT,
            wa_message_id=wa_message_id,
        )

    @staticmethod
    def send_receipt_whatsapp(receipt_id: int) -> None:
        receipt = (
            Receipt.objects.select_related("academy", "invoice", "invoice__parent")
            .prefetch_related("invoice__items__student")
            .get(pk=receipt_id)
        )
        academy = receipt.academy

        config = WhatsAppNotificationService._get_config(academy)
        # Guard order (required):
        if not config or config.is_enabled is False:
            WhatsAppNotificationService._log(
                academy=academy,
                doc_type=NotificationLog.DocType.RECEIPT,
                object_id=receipt_id,
                recipient_phone="",
                status=NotificationLog.Status.SKIPPED,
            )
            return

        if config.send_on_receipt_created is False:
            WhatsAppNotificationService._log(
                academy=academy,
                doc_type=NotificationLog.DocType.RECEIPT,
                object_id=receipt_id,
                recipient_phone="",
                status=NotificationLog.Status.SKIPPED,
            )
            return

        parent = receipt.invoice.parent
        raw_phone = getattr(parent, "phone", "") or ""
        normalized_phone = normalize_to_e164(raw_phone, academy_country=getattr(academy, "country", "") or "ARE")
        if normalized_phone is None:
            WhatsAppNotificationService._log(
                academy=academy,
                doc_type=NotificationLog.DocType.RECEIPT,
                object_id=receipt_id,
                recipient_phone="",
                status=NotificationLog.Status.FAILED,
                error_detail="Phone could not be normalized to E.164",
            )
            return

        pdf_service = PDFService()
        s3_key = pdf_service.generate_receipt_pdf(receipt_id)
        pdf_url = pdf_service.get_presigned_url(s3_key, expiry_seconds=900)

        access_token = WhatsAppNotificationService._decrypt_token(config)
        try:
            wa_message_id = WhatsAppNotificationService._send_template_message(
                phone_number_id=config.phone_number_id,
                access_token=access_token,
                to_phone=normalized_phone,
                template_name=config.receipt_template_name,
                language=config.template_language,
                components=WhatsAppNotificationService._build_receipt_components(receipt, pdf_url),
            )
        except WhatsAppDispatchHTTPError as exc:
            WhatsAppNotificationService._log(
                academy=academy,
                doc_type=NotificationLog.DocType.RECEIPT,
                object_id=receipt_id,
                recipient_phone=normalized_phone,
                status=NotificationLog.Status.FAILED,
                error_detail=exc.error_detail or "",
            )
            # HTTP 4xx must not trigger Celery retry.
            if exc.status_code < 500:
                return
            raise

        WhatsAppNotificationService._log(
            academy=academy,
            doc_type=NotificationLog.DocType.RECEIPT,
            object_id=receipt_id,
            recipient_phone=normalized_phone,
            status=NotificationLog.Status.SENT,
            wa_message_id=wa_message_id,
        )

