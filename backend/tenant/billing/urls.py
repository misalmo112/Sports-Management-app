"""
URL configuration for billing app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from tenant.billing.views import (
    BulkIssueView,
    InvoiceScheduleViewSet,
    ItemViewSet,
    InvoiceViewSet,
    PendingApprovalsView,
    ReceiptViewSet,
    StudentScheduleOverrideViewSet,
)

router = DefaultRouter()
router.register(r'items', ItemViewSet, basename='item')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'receipts', ReceiptViewSet, basename='receipt')
router.register(r'invoice-schedules', InvoiceScheduleViewSet, basename='invoice-schedule')
router.register(
    r'invoice-schedules/(?P<schedule_id>[^/.]+)/overrides',
    StudentScheduleOverrideViewSet,
    basename='schedule-override',
)

urlpatterns = [
    path('', include(router.urls)),
    path('pending-approvals/', PendingApprovalsView.as_view()),
    path('bulk-issue/', BulkIssueView.as_view()),
]
