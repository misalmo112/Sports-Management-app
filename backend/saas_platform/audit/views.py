"""
Views for Platform Audit Logs API (Superadmin only).
"""
import logging
from rest_framework import viewsets, generics
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from django.conf import settings
from saas_platform.audit.models import AuditLog, AuditAction, ResourceType, ErrorLog
from saas_platform.audit.serializers import AuditLogSerializer, ErrorLogSerializer
from saas_platform.audit.services import ErrorLogService
from shared.permissions.platform import IsPlatformAdmin
from shared.permissions.tenant import IsTenantAdmin

logger = logging.getLogger(__name__)


class AuditLogFilter(filters.FilterSet):
    """Filter set for AuditLog list view."""

    action = filters.ChoiceFilter(choices=AuditAction.choices)
    resource_type = filters.ChoiceFilter(choices=ResourceType.choices)
    academy = filters.UUIDFilter(field_name='academy_id')
    user = filters.NumberFilter(field_name='user_id')
    date_from = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    date_to = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    scope = filters.ChoiceFilter(choices=[('PLATFORM', 'Platform'), ('TENANT', 'Tenant')])

    class Meta:
        model = AuditLog
        fields = ['action', 'resource_type', 'academy', 'user', 'date_from', 'date_to', 'scope']


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Audit Log viewing (Superadmin only, read-only).

    GET /api/v1/platform/audit-logs/ — List audit logs (both PLATFORM and TENANT scope)
    GET /api/v1/platform/audit-logs/{id}/ — Get audit log details

    Use ?scope=TENANT or ?scope=PLATFORM to narrow results.
    """
    queryset = AuditLog.objects.select_related('user', 'academy').all()
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
    service = filters.CharFilter(field_name='service', lookup_expr='iexact')
    environment = filters.CharFilter(field_name='environment')
    date_from = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    date_to = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    severity = filters.ChoiceFilter(choices=ErrorLog.Severity.choices)
    is_resolved = filters.BooleanFilter()

    class Meta:
        model = ErrorLog
        fields = [
            'academy', 'user', 'status_code', 'code', 'request_id',
            'service', 'environment', 'date_from', 'date_to',
            'severity', 'is_resolved',
        ]


class ErrorLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Error Log viewing (Superadmin only, read-only).

    GET /api/v1/platform/error-logs/ — List error logs
    GET /api/v1/platform/error-logs/{id}/ — Get error log details
    POST /api/v1/platform/error-logs/{id}/resolve/ — Mark as resolved
    """
    queryset = ErrorLog.objects.select_related('user', 'academy', 'resolved_by').all()
    permission_classes = [IsPlatformAdmin]
    serializer_class = ErrorLogSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ErrorLogFilter
    search_fields = ['path', 'message', 'request_id', 'user__email', 'academy__name']
    ordering_fields = ['created_at', 'status_code', 'code', 'severity', 'occurrence_count']
    ordering = ['-created_at']

    @action(detail=True, methods=['post'], permission_classes=[IsPlatformAdmin])
    def resolve(self, request, pk=None):
        success = ErrorLogService.resolve(pk, request.user)
        if success:
            return Response({'status': 'resolved'})
        return Response({'detail': 'Already resolved or not found.'}, status=400)


class ErrorLogIngestView(APIView):
    """
    POST /api/v1/platform/error-logs/ingest/
    Accepts client-side error reports from the React frontend.
    Any authenticated user may report; rate-limited per user.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [UserRateThrottle]

    def post(self, request):
        data = request.data
        try:
            ErrorLog.objects.create(
                request_id=str(data.get('request_id', ''))[:64],
                path=str(data.get('path', ''))[:255],
                method='CLIENT',
                status_code=int(data.get('status_code', 0)),
                code=str(data.get('code', 'CLIENT_ERROR'))[:50],
                message=str(data.get('message', ''))[:500],
                stacktrace=str(data.get('stacktrace', ''))[:10_000],
                academy=getattr(request, 'academy', None),
                user=request.user,
                role=getattr(request.user, 'role', ''),
                service='frontend',
                severity=ErrorLog.Severity.MEDIUM,
                environment=getattr(settings, 'ENVIRONMENT', 'development'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:512],
            )
        except Exception:
            logger.exception('ErrorLogIngestView failed')
        return Response({'status': 'ok'}, status=201)


class ErrorLogSummaryView(APIView):
    """
    GET /api/v1/platform/error-logs/summary/
    Returns counts for the error dashboard header cards.
    Permission: IsPlatformAdmin
    """
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta
        from django.db.models import Count

        now = timezone.now()
        last_24h = now - timedelta(hours=24)

        critical_unresolved = ErrorLog.objects.filter(
            severity=ErrorLog.Severity.CRITICAL,
            is_resolved=False,
        ).count()

        high_unresolved = ErrorLog.objects.filter(
            severity=ErrorLog.Severity.HIGH,
            is_resolved=False,
        ).count()

        total_last_24h = ErrorLog.objects.filter(
            created_at__gte=last_24h,
        ).count()

        # Most affected academy (by unresolved error count)
        most_affected = (
            ErrorLog.objects
            .filter(is_resolved=False, academy__isnull=False)
            .values('academy__id', 'academy__name')
            .annotate(count=Count('id'))
            .order_by('-count')
            .first()
        )

        most_affected_data = None
        if most_affected:
            most_affected_data = {
                'id': str(most_affected['academy__id']),
                'name': most_affected['academy__name'],
                'count': most_affected['count'],
            }

        return Response({
            'critical_unresolved': critical_unresolved,
            'high_unresolved': high_unresolved,
            'total_last_24h': total_last_24h,
            'most_affected_academy': most_affected_data,
        })


# ---------------------------------------------------------------------------
# Tenant-scoped audit log view
# ---------------------------------------------------------------------------

class TenantAuditLogFilter(filters.FilterSet):
    """Filter set for the tenant audit log endpoint."""

    action = filters.ChoiceFilter(choices=AuditAction.choices)
    resource_type = filters.ChoiceFilter(choices=ResourceType.choices)
    user_email = filters.CharFilter(field_name='user__email', lookup_expr='icontains')
    date_from = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    date_to = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')

    class Meta:
        model = AuditLog
        fields = ['action', 'resource_type', 'user_email', 'date_from', 'date_to']


class TenantAuditLogView(generics.ListAPIView):
    """
    GET /api/v1/tenant/audit-logs/
    Returns paginated audit trail for the requesting academy.
    Accessible by OWNER and ADMIN only.
    """
    serializer_class = AuditLogSerializer
    permission_classes = [IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TenantAuditLogFilter
    search_fields = ['user__email', 'resource_id']
    ordering_fields = ['created_at', 'action', 'resource_type']
    ordering = ['-created_at']

    def get_queryset(self):
        return (
            AuditLog.objects
            .filter(scope='TENANT', academy=self.request.academy)
            .select_related('user', 'academy')
        )
