"""
URL configuration for Platform Plans API.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from saas_platform.finance.views import PaymentExportView
from saas_platform.subscriptions.views import PlanViewSet, PlatformPaymentViewSet

router = DefaultRouter()
router.register(r'plans', PlanViewSet, basename='plan')
router.register(r'finance/payments', PlatformPaymentViewSet, basename='platform-payment')

urlpatterns = [
    path('finance/payments/export/', PaymentExportView.as_view(), name='payment-export'),
    path('', include(router.urls)),
]
