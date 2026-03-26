import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from shared.permissions.tenant import IsTenantAdmin
from tenant.notifications.serializers import NotificationLogSerializer
from tenant.notifications.services import (
    get_invoice_notification_logs,
    get_receipt_notification_logs,
    resend_invoice_notifications,
    resend_receipt_notifications,
)

logger = logging.getLogger(__name__)


class PaymentWebhookView(APIView):
    """
    Webhook stub for future payment gateway integration.

    Intentionally open (no auth) to support early gateway testing.
    """

    permission_classes = []  # Allow unauthenticated requests

    def post(self, request, *args, **kwargs):
        # Keep payload logging lightweight; do not assume structure.
        logger.info("Payments webhook received: %s", request.data)
        return Response({"status": "received"}, status=status.HTTP_200_OK)


class ResendInvoiceNotificationsView(APIView):
    permission_classes = [IsTenantAdmin]

    def post(self, request, invoice_id: int, *args, **kwargs):
        resend_invoice_notifications(academy=request.academy, invoice_id=invoice_id)
        return Response({"status": "accepted"}, status=status.HTTP_202_ACCEPTED)


class ResendReceiptNotificationsView(APIView):
    permission_classes = [IsTenantAdmin]

    def post(self, request, receipt_id: int, *args, **kwargs):
        resend_receipt_notifications(academy=request.academy, receipt_id=receipt_id)
        return Response({"status": "accepted"}, status=status.HTTP_202_ACCEPTED)


class InvoiceNotificationLogsView(APIView):
    permission_classes = [IsTenantAdmin]

    def get(self, request, invoice_id: int, *args, **kwargs):
        logs = get_invoice_notification_logs(academy=request.academy, invoice_id=invoice_id)
        serializer = NotificationLogSerializer(logs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ReceiptNotificationLogsView(APIView):
    permission_classes = [IsTenantAdmin]

    def get(self, request, receipt_id: int, *args, **kwargs):
        logs = get_receipt_notification_logs(academy=request.academy, receipt_id=receipt_id)
        serializer = NotificationLogSerializer(logs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

