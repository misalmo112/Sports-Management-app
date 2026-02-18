"""
URL configuration for Tenant Reports API.
"""
from django.urls import path
from tenant.reports.views import ReportsView, ReportsExportView

urlpatterns = [
    path('reports/', ReportsView.as_view(), name='tenant-reports'),
    path('reports/export/', ReportsExportView.as_view(), name='tenant-reports-export'),
]
