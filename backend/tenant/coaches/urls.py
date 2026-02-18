from django.urls import path, include
from rest_framework.routers import DefaultRouter
from tenant.coaches.views import (
    CoachViewSet,
    CoachPaySchemeViewSet,
    CoachPaymentViewSet,
    StaffInvoiceViewSet,
    StaffReceiptViewSet,
)

router = DefaultRouter()
router.register(r'coaches', CoachViewSet, basename='coach')
router.register(r'pay-schemes', CoachPaySchemeViewSet, basename='coach-pay-scheme')
router.register(r'coach-payments', CoachPaymentViewSet, basename='coach-payment')
router.register(r'staff-invoices', StaffInvoiceViewSet, basename='staff-invoice')
router.register(r'staff-receipts', StaffReceiptViewSet, basename='staff-receipt')

urlpatterns = [
    path('', include(router.urls)),
]
