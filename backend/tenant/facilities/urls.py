"""URL configuration for facilities app."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from tenant.facilities.views import (
    BillLineItemViewSet,
    BillViewSet,
    FacilityRentConfigViewSet,
    InventoryItemViewSet,
    RentInvoiceViewSet,
    RentReceiptViewSet,
)

router = DefaultRouter()
router.register(r'rent-configs', FacilityRentConfigViewSet, basename='facility-rent-config')
router.register(r'rent-invoices', RentInvoiceViewSet, basename='rent-invoice')
router.register(r'rent-receipts', RentReceiptViewSet, basename='rent-receipt')
router.register(r'bills', BillViewSet, basename='facility-bill')
router.register(r'bill-line-items', BillLineItemViewSet, basename='facility-bill-line-item')
router.register(r'inventory-items', InventoryItemViewSet, basename='inventory-item')

urlpatterns = [
    path('facilities/', include(router.urls)),
]
