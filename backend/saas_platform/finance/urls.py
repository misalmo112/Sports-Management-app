from django.urls import path
from rest_framework.routers import DefaultRouter

from saas_platform.finance.views import (
    FinanceSummaryView,
    FinanceTrendView,
    OperationalExpenseViewSet,
    PaymentExportView,
)


router = DefaultRouter()
router.register(r'finance/expenses', OperationalExpenseViewSet, basename='operational-expense')

urlpatterns = [
    path('finance/payments/export/', PaymentExportView.as_view(), name='payment-export'),
    path('finance/summary/', FinanceSummaryView.as_view(), name='finance-summary'),
    path('finance/trends/', FinanceTrendView.as_view(), name='finance-trends'),
] + router.urls
