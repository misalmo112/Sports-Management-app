"""
URL configuration for billing app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from tenant.billing.views import ItemViewSet, InvoiceViewSet, ReceiptViewSet

router = DefaultRouter()
router.register(r'items', ItemViewSet, basename='item')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'receipts', ReceiptViewSet, basename='receipt')

urlpatterns = [
    path('', include(router.urls)),
]
