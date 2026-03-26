"""
URL configuration for Platform Audit Logs API.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from saas_platform.audit.views import (
    AuditLogViewSet,
    ErrorLogViewSet,
    ErrorLogIngestView,
    ErrorLogSummaryView,
)

router = DefaultRouter()
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')
router.register(r'error-logs', ErrorLogViewSet, basename='error-log')

urlpatterns = [
    # Static paths must come before router.urls to avoid being matched as {pk}/
    path('error-logs/ingest/', ErrorLogIngestView.as_view(), name='error-log-ingest'),
    path('error-logs/summary/', ErrorLogSummaryView.as_view(), name='error-log-summary'),
    path('', include(router.urls)),
]
