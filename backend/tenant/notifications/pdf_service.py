from __future__ import annotations

from typing import Any
from urllib.parse import urlparse, urlunparse

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.template.loader import render_to_string
from django.utils import timezone

from tenant.billing.models import Invoice, Receipt

try:
    from weasyprint import HTML

    WEASYPRINT_AVAILABLE = True
except Exception:  # pragma: no cover - depends on system libs
    HTML = None
    WEASYPRINT_AVAILABLE = False

try:
    import boto3
    from botocore.exceptions import ClientError

    BOTO3_AVAILABLE = True
except Exception:  # pragma: no cover
    boto3 = None
    ClientError = Exception
    BOTO3_AVAILABLE = False


class PDFService:
    """
    Generates branded Invoice/Receipt PDFs (tenant layer) and stores them in S3/MinIO.

    Note: This module intentionally fails at render time (not import time) if WeasyPrint
    system dependencies are missing.
    """

    def generate_invoice_pdf(self, invoice_id: int) -> str:
        invoice = (
            Invoice.objects.select_related("academy", "parent")
            .prefetch_related("items__student")
            .get(pk=invoice_id)
        )

        if invoice.pdf_s3_key:
            # Idempotency: if the object exists in S3, return it as-is.
            if self._s3_object_exists(invoice.pdf_s3_key):
                return invoice.pdf_s3_key

        s3_key = f"{invoice.academy.slug}/documents/invoices/{invoice.invoice_number}.pdf"

        context = self._invoice_context(invoice)
        html = self._render_html("notifications/invoice_pdf.html", context)
        pdf_bytes = self._html_to_pdf(html)
        self._upload_to_s3(pdf_bytes, s3_key)

        invoice.pdf_s3_key = s3_key
        invoice.pdf_generated_at = timezone.now()
        invoice.save(update_fields=["pdf_s3_key", "pdf_generated_at"])
        return s3_key

    def generate_receipt_pdf(self, receipt_id: int) -> str:
        receipt = (
            Receipt.objects.select_related("academy", "invoice", "invoice__parent")
            .prefetch_related("invoice__items__student")
            .get(pk=receipt_id)
        )

        if receipt.pdf_s3_key:
            if self._s3_object_exists(receipt.pdf_s3_key):
                return receipt.pdf_s3_key

        s3_key = f"{receipt.academy.slug}/documents/receipts/{receipt.receipt_number}.pdf"

        context = self._receipt_context(receipt)
        html = self._render_html("notifications/receipt_pdf.html", context)
        pdf_bytes = self._html_to_pdf(html)
        self._upload_to_s3(pdf_bytes, s3_key)

        receipt.pdf_s3_key = s3_key
        receipt.pdf_generated_at = timezone.now()
        receipt.save(update_fields=["pdf_s3_key", "pdf_generated_at"])
        return s3_key

    def get_presigned_url(self, s3_key: str, expiry_seconds: int = 900) -> str:
        """
        Generate a presigned URL for a private object.

        Returns:
            URL string starting with `https://` (best-effort; coerces from http://).
        """

        if not BOTO3_AVAILABLE:
            raise RuntimeError("boto3 is required to generate presigned URLs.")

        bucket_name = getattr(default_storage, "bucket_name", None) or getattr(
            settings, "AWS_STORAGE_BUCKET_NAME", None
        )
        if not bucket_name:
            raise RuntimeError("AWS_STORAGE_BUCKET_NAME must be set to generate presigned URLs.")

        public_endpoint = (getattr(settings, "AWS_S3_PUBLIC_ENDPOINT_URL", None) or "").strip()
        internal_endpoint = (getattr(settings, "AWS_S3_ENDPOINT_URL", None) or "").strip()
        chosen_endpoint = (public_endpoint or internal_endpoint).rstrip("/")
        if not chosen_endpoint:
            raise RuntimeError("AWS_S3_ENDPOINT_URL/AWS_S3_PUBLIC_ENDPOINT_URL must be set.")

        s3_client = boto3.client(
            "s3",
            endpoint_url=chosen_endpoint,
            aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None),
            aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None),
            region_name=getattr(settings, "AWS_S3_REGION_NAME", "us-east-1"),
            use_ssl=getattr(settings, "AWS_S3_USE_SSL", False),
        )

        url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket_name, "Key": s3_key},
            ExpiresIn=expiry_seconds,
        )

        # Do NOT blindly force https:// in dev.
        #
        # In local MinIO setups the public endpoint is commonly plain HTTP (e.g. http://127.0.0.1:9000).
        # Forcing https:// would make the browser attempt TLS against a non-TLS server and fail with
        # "sent an invalid response".
        #
        # We only upgrade to https when the configured endpoint implies TLS.
        endpoint_scheme = urlparse(chosen_endpoint).scheme.lower()
        want_https = endpoint_scheme == "https" or bool(getattr(settings, "AWS_S3_USE_SSL", False))
        if want_https:
            parts = urlparse(url)
            if parts.scheme == "http":
                url = urlunparse(parts._replace(scheme="https"))
        return url

    def _render_html(self, template_name: str, context: dict[str, Any]) -> str:
        return render_to_string(template_name, context)

    def _html_to_pdf(self, html: str) -> bytes:
        if not WEASYPRINT_AVAILABLE or HTML is None:
            raise RuntimeError(
                "WeasyPrint is not available. Install `weasyprint>=60.0` and ensure required "
                "system dependencies (GTK/Pango) are present in the container."
            )
        return HTML(string=html).write_pdf()

    def _upload_to_s3(self, pdf_bytes: bytes, s3_key: str) -> str:
        storage = default_storage

        # Ensure content-type for correct response headers on S3 GET.
        filename = s3_key.rsplit("/", 1)[-1]
        uploaded = SimpleUploadedFile(filename, pdf_bytes, content_type="application/pdf")

        storage.save(s3_key, uploaded)
        return s3_key

    def _s3_object_exists(self, s3_key: str) -> bool:
        """
        Best-effort existence check using S3 HEAD request (preferred), then fallback to storage.exists().
        """

        # Preferred: boto3 HEAD.
        bucket_name = getattr(default_storage, "bucket_name", None) or getattr(
            settings, "AWS_STORAGE_BUCKET_NAME", None
        )
        endpoint_url = getattr(settings, "AWS_S3_ENDPOINT_URL", None)

        if BOTO3_AVAILABLE and bucket_name and endpoint_url:
            s3_client = boto3.client(
                "s3",
                endpoint_url=endpoint_url,
                aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None),
                aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None),
                region_name=getattr(settings, "AWS_S3_REGION_NAME", "us-east-1"),
                use_ssl=getattr(settings, "AWS_S3_USE_SSL", False),
            )

            try:
                s3_client.head_object(Bucket=bucket_name, Key=s3_key)
                return True
            except ClientError as e:
                error_code = (e.response or {}).get("Error", {}).get("Code", "")
                if error_code in {"404", "NoSuchKey", "NotFound"}:
                    return False
                # Any other error is a real failure.
                raise

        # Fallback: whatever the storage backend supports.
        try:
            return storage_exists(default_storage, s3_key)
        except Exception:
            return False

    def _invoice_context(self, invoice: Invoice) -> dict[str, Any]:
        academy = invoice.academy
        parent = invoice.parent
        items = invoice.items.select_related("student", "item").all()

        student_names: list[str] = []
        seen = set()
        for inv_item in items:
            if inv_item.student and inv_item.student.pk:
                name = inv_item.student.full_name
                if name not in seen:
                    seen.add(name)
                    student_names.append(name)

        return {
            "academy": academy,
            "invoice": invoice,
            "parent_full_name": parent.full_name,
            "student_names": student_names,
            "line_items": items,
            "currency": getattr(academy, "currency", "USD"),
        }

    def _receipt_context(self, receipt: Receipt) -> dict[str, Any]:
        academy = receipt.academy
        invoice = receipt.invoice
        items = invoice.items.select_related("student", "item").all()

        # Receipt PDF only needs invoice ref + remaining balance; we still include
        # student names to keep template flexibility.
        student_names: list[str] = []
        seen = set()
        for inv_item in items:
            if inv_item.student and inv_item.student.pk:
                name = inv_item.student.full_name
                if name not in seen:
                    seen.add(name)
                    student_names.append(name)

        return {
            "academy": academy,
            "receipt": receipt,
            "invoice": invoice,
            "parent_full_name": invoice.parent.full_name,
            "student_names": student_names,
            "payment_method_display": receipt.get_payment_method_display(),
            "remaining_balance": invoice.get_remaining_balance(),
            "currency": getattr(academy, "currency", "USD"),
        }


def storage_exists(storage, s3_key: str) -> bool:
    # Isolated helper to keep _s3_object_exists readable.
    if hasattr(storage, "exists"):
        return storage.exists(s3_key)
    return False

