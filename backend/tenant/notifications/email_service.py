from __future__ import annotations

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from tenant.billing.models import Invoice, Receipt
from tenant.notifications.models import NotificationLog
from tenant.notifications.pdf_service import PDFService


class EmailNotificationService:
    """
    Send branded email notifications for tenant billing documents.

    Business logic lives here (service layer), while templates contain the
    presentation details.
    """

    @staticmethod
    def _log(
        academy,
        channel: str,
        doc_type: str,
        object_id: int,
        recipient_email: str,
        status: str,
        error_detail: str = "",
    ) -> None:
        NotificationLog.objects.create(
            academy=academy,
            channel=channel,
            doc_type=doc_type,
            object_id=object_id,
            recipient_email=recipient_email or "",
            recipient_phone="",
            status=status,
            error_detail=error_detail or "",
        )

    @staticmethod
    def _get_download_url(s3_key: str) -> str:
        """
        Generate a presigned URL that is valid for 1 hour.
        """
        pdf_service = PDFService()
        return pdf_service.get_presigned_url(s3_key, expiry_seconds=3600)

    @staticmethod
    def send_invoice_email(invoice_id: int) -> None:
        invoice = (
            Invoice.objects.select_related("academy", "parent")
            .prefetch_related("items__student")
            .get(pk=invoice_id)
        )

        parent = invoice.parent
        recipient_email = (getattr(parent, "email", "") or "").strip()
        if not recipient_email:
            EmailNotificationService._log(
                academy=invoice.academy,
                channel=NotificationLog.Channel.EMAIL,
                doc_type=NotificationLog.DocType.INVOICE,
                object_id=invoice_id,
                recipient_email="",
                status=NotificationLog.Status.SKIPPED,
            )
            return

        # Generate/retrieve the invoice PDF and create a 1-hour presigned link.
        pdf_service = PDFService()
        s3_key = pdf_service.generate_invoice_pdf(invoice_id)
        pdf_url = EmailNotificationService._get_download_url(s3_key)

        payment_url = (invoice.payment_link or "").strip()
        subject = f"Invoice {invoice.invoice_number} from {invoice.academy.name}"
        context = {
            "email_subject": subject,
            "invoice_number": invoice.invoice_number,
            "academy_name": invoice.academy.name,
            "parent_first_name": getattr(parent, "first_name", "") or "",
            "total": str(invoice.total),
            "due_date": str(invoice.due_date) if invoice.due_date else "",
            "pdf_url": pdf_url,
            "payment_url": payment_url,
        }

        html_body = render_to_string("notifications/email_invoice.html", context)
        text_body = render_to_string("notifications/email_invoice.txt", context)

        email = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email],
        )
        email.attach_alternative(html_body, "text/html")

        try:
            email.send(fail_silently=False)
        except Exception as exc:  # pragma: no cover (covered via mocks in tests)
            EmailNotificationService._log(
                academy=invoice.academy,
                channel=NotificationLog.Channel.EMAIL,
                doc_type=NotificationLog.DocType.INVOICE,
                object_id=invoice_id,
                recipient_email=recipient_email,
                status=NotificationLog.Status.FAILED,
                error_detail=str(exc)[:4000],
            )
            raise

        EmailNotificationService._log(
            academy=invoice.academy,
            channel=NotificationLog.Channel.EMAIL,
            doc_type=NotificationLog.DocType.INVOICE,
            object_id=invoice_id,
            recipient_email=recipient_email,
            status=NotificationLog.Status.SENT,
        )

    @staticmethod
    def send_receipt_email(receipt_id: int) -> None:
        receipt = (
            Receipt.objects.select_related("academy", "invoice", "invoice__parent")
            .prefetch_related("invoice__items__student")
            .get(pk=receipt_id)
        )

        parent = receipt.invoice.parent
        recipient_email = (getattr(parent, "email", "") or "").strip()
        if not recipient_email:
            EmailNotificationService._log(
                academy=receipt.academy,
                channel=NotificationLog.Channel.EMAIL,
                doc_type=NotificationLog.DocType.RECEIPT,
                object_id=receipt_id,
                recipient_email="",
                status=NotificationLog.Status.SKIPPED,
            )
            return

        pdf_service = PDFService()
        s3_key = pdf_service.generate_receipt_pdf(receipt_id)
        pdf_url = EmailNotificationService._get_download_url(s3_key)

        subject = f"Payment Receipt {receipt.receipt_number} — {receipt.academy.name}"
        context = {
            "email_subject": subject,
            "receipt_number": receipt.receipt_number,
            "academy_name": receipt.academy.name,
            "parent_first_name": getattr(parent, "first_name", "") or "",
            "amount": str(receipt.amount),
            "pdf_url": pdf_url,
        }

        html_body = render_to_string("notifications/email_receipt.html", context)
        text_body = render_to_string("notifications/email_receipt.txt", context)

        email = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email],
        )
        email.attach_alternative(html_body, "text/html")

        try:
            email.send(fail_silently=False)
        except Exception as exc:  # pragma: no cover (covered via mocks in tests)
            EmailNotificationService._log(
                academy=receipt.academy,
                channel=NotificationLog.Channel.EMAIL,
                doc_type=NotificationLog.DocType.RECEIPT,
                object_id=receipt_id,
                recipient_email=recipient_email,
                status=NotificationLog.Status.FAILED,
                error_detail=str(exc)[:4000],
            )
            raise

        EmailNotificationService._log(
            academy=receipt.academy,
            channel=NotificationLog.Channel.EMAIL,
            doc_type=NotificationLog.DocType.RECEIPT,
            object_id=receipt_id,
            recipient_email=recipient_email,
            status=NotificationLog.Status.SENT,
        )

