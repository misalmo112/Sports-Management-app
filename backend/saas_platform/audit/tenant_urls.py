"""
Tenant-scoped URL configuration for the Audit API.
Mounted under api/v1/tenant/ in config/urls.py.
"""
from django.urls import path
from saas_platform.audit.views import TenantAuditLogView

urlpatterns = [
    path('audit-logs/', TenantAuditLogView.as_view(), name='tenant-audit-logs'),
]
