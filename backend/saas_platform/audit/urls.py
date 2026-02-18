"""
URL configuration for Platform Audit Logs API.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from saas_platform.audit.views import AuditLogViewSet, ErrorLogViewSet

router = DefaultRouter()
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')
router.register(r'error-logs', ErrorLogViewSet, basename='error-log')

urlpatterns = [
    path('', include(router.urls)),
]
