from django.urls import path

from tenant.notifications.views import (
    InvoiceNotificationLogsView,
    PaymentWebhookView,
    ReceiptNotificationLogsView,
    ResendInvoiceNotificationsView,
    ResendReceiptNotificationsView,
)


urlpatterns = [
    # Webhook stubs
    path("webhooks/payments/", PaymentWebhookView.as_view(), name="payments-webhook"),

    # Resend endpoints
    path(
        "tenant/invoices/<int:invoice_id>/resend-notifications/",
        ResendInvoiceNotificationsView.as_view(),
        name="resend-invoice-notifications",
    ),
    path(
        "tenant/receipts/<int:receipt_id>/resend-notifications/",
        ResendReceiptNotificationsView.as_view(),
        name="resend-receipt-notifications",
    ),

    # Notification log queries
    path(
        "tenant/invoices/<int:invoice_id>/notification-logs/",
        InvoiceNotificationLogsView.as_view(),
        name="invoice-notification-logs",
    ),
    path(
        "tenant/receipts/<int:receipt_id>/notification-logs/",
        ReceiptNotificationLogsView.as_view(),
        name="receipt-notification-logs",
    ),
]

