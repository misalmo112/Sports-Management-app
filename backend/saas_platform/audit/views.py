"""
Views for Platform Audit Logs API (Superadmin only).
"""
from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from django.utils import timezone
from datetime import timedelta
from saas_platform.audit.models import AuditLog, AuditAction, ResourceType, ErrorLog
from saas_platform.audit.serializers import AuditLogSerializer, ErrorLogSerializer
from shared.permissions.platform import IsPlatformAdmin


class AuditLogFilter(filters.FilterSet):
    """Filter set for AuditLog list view."""
    
    action = filters.ChoiceFilter(choices=AuditAction.choices)
    resource_type = filters.ChoiceFilter(choices=ResourceType.choices)
    academy = filters.UUIDFilter(field_name='academy_id')
    user = filters.NumberFilter(field_name='user_id')
    date_from = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    date_to = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    
    class Meta:
        model = AuditLog
        fields = ['action', 'resource_type', 'academy', 'user', 'date_from', 'date_to']


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Audit Log viewing (Superadmin only, read-only).
    
    Provides:
    - GET /api/v1/platform/audit-logs/ - List audit logs
    - GET /api/v1/platform/audit-logs/{id}/ - Get audit log details
    """
    queryset = AuditLog.objects.all()
    permission_classes = [IsPlatformAdmin]
    serializer_class = AuditLogSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = AuditLogFilter
    search_fields = ['resource_id', 'user__email', 'academy__name']
    ordering_fields = ['created_at', 'action', 'resource_type']
    ordering = ['-created_at']


class ErrorLogFilter(filters.FilterSet):
    """Filter set for ErrorLog list view."""
    
    academy = filters.UUIDFilter(field_name='academy_id')
    user = filters.NumberFilter(field_name='user_id')
    status_code = filters.NumberFilter(field_name='status_code')
    code = filters.CharFilter(field_name='code')
    request_id = filters.CharFilter(field_name='request_id')
    service = filters.CharFilter(field_name='service')
    environment = filters.CharFilter(field_name='environment')
    date_from = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    date_to = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    
    class Meta:
        model = ErrorLog
        fields = [
            'academy',
            'user',
            'status_code',
            'code',
            'request_id',
            'service',
            'environment',
            'date_from',
            'date_to',
        ]


class ErrorLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Error Log viewing (Superadmin only, read-only).
    
    Provides:
    - GET /api/v1/platform/error-logs/ - List error logs
    - GET /api/v1/platform/error-logs/{id}/ - Get error log details
    """
    queryset = ErrorLog.objects.all()
    permission_classes = [IsPlatformAdmin]
    serializer_class = ErrorLogSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ErrorLogFilter
    search_fields = ['path', 'message', 'request_id', 'user__email', 'academy__name']
    ordering_fields = ['created_at', 'status_code', 'code']
    ordering = ['-created_at']
