import logging

from celery import shared_task
from django.utils import timezone

from saas_platform.subscriptions.models import PlatformPayment


logger = logging.getLogger(__name__)


class XeroClientStub:
    def create_invoice(self, payment):
        raise NotImplementedError('Xero sync is not configured for this environment.')


xero_client = XeroClientStub()


@shared_task
def sync_payments_to_xero():
    """Sync unsynced platform payments to Xero and stamp sync metadata."""
    unsynced_payments = PlatformPayment.objects.filter(synced_at__isnull=True).select_related(
        'academy',
        'subscription__plan',
    )

    for payment in unsynced_payments:
        try:
            xero_id = xero_client.create_invoice(payment)
            payment.external_ref = xero_id
            payment.synced_at = timezone.now()
            payment.save(update_fields=['external_ref', 'synced_at'])
        except Exception as exc:
            logger.error('Xero sync failed for payment %s: %s', payment.id, exc)

