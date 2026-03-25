import logging

from celery import shared_task
from django.utils import timezone

from saas_platform.finance.xero_client import XeroClient, XeroNotConfiguredError
from saas_platform.subscriptions.models import PlatformPayment

logger = logging.getLogger(__name__)


@shared_task(
    autoretry_for=(Exception,),
    dont_autoretry_for=(XeroNotConfiguredError, NotImplementedError),
    max_retries=3,
    retry_backoff=30,
    retry_backoff_max=300,
    retry_jitter=True,
)
def sync_payments_to_xero():
    """Sync unsynced platform payments to Xero and stamp sync metadata."""
    unsynced_payments = PlatformPayment.objects.filter(synced_at__isnull=True).select_related(
        "academy",
        "subscription__plan",
    )

    # Avoid emitting "missing credentials" warnings if there's nothing to sync.
    if not unsynced_payments.exists():
        return

    try:
        xero_client = XeroClient()
    except XeroNotConfiguredError as exc:
        logger.warning("Xero sync skipped: %s", exc)
        return

    for payment in unsynced_payments:
        try:
            xero_id = xero_client.create_invoice(payment)
        except Exception as exc:
            logger.error("Xero sync failed for payment %s: %s", payment.id, exc)
            raise

        payment.external_ref = xero_id
        payment.synced_at = timezone.now()
        payment.save(update_fields=["external_ref", "synced_at"])

