from saas_platform.audit.models import AuditLog, AuditAction, ResourceType
from decimal import Decimal
import logging as _logging
from datetime import timedelta


DEDUP_WINDOW_MINUTES = 60


class AuditService:
    """Service for platform audit logging."""

    @staticmethod
    def log_action(
        user,
        action,
        resource_type,
        resource_id,
        academy=None,
        changes_json=None,
        request=None,
        scope='PLATFORM',
    ):
        """
        Log an action to the audit log.

        Args:
            user: User instance who performed the action
            action: AuditAction enum value
            resource_type: ResourceType enum value
            resource_id: ID of the resource (as string)
            academy: Academy instance (optional)
            changes_json: Dictionary of changes (before/after) (optional)
            request: Django request object (optional, for IP/UA)
            scope: 'PLATFORM' or 'TENANT' (default 'PLATFORM')

        Returns:
            AuditLog instance
        """
        ip_address = None
        user_agent = ''

        if request:
            ip_address = get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')

        serializable_changes = _make_json_serializable(changes_json or {})

        audit_log = AuditLog.objects.create(
            user=user,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id),
            academy=academy,
            changes_json=serializable_changes,
            ip_address=ip_address,
            user_agent=user_agent,
            scope=scope,
        )

        return audit_log


class TenantAuditService:
    """Convenience wrapper for academy-scoped audit entries."""

    @staticmethod
    def log(
        user,
        action,
        resource_type,
        resource_id,
        academy,
        changes_json=None,
        request=None,
    ):
        """
        Write a TENANT-scoped audit log entry.
        Wraps AuditService.log_action and forces scope='TENANT'.
        Never raises — failures are logged to stderr only.
        """
        try:
            return AuditService.log_action(
                user=user,
                action=action,
                resource_type=resource_type,
                resource_id=str(resource_id),
                academy=academy,
                changes_json=changes_json or {},
                request=request,
                scope='TENANT',
            )
        except Exception:
            _logging.getLogger(__name__).exception(
                'TenantAuditService.log failed silently'
            )
            return None


class ErrorLogService:

    @staticmethod
    def _severity_from_status(status_code: int) -> str:
        from saas_platform.audit.models import ErrorLog
        if status_code == 500:
            return ErrorLog.Severity.CRITICAL
        if status_code in (502, 503, 504):
            return ErrorLog.Severity.HIGH
        if status_code in (400, 409, 422):
            return ErrorLog.Severity.MEDIUM
        return ErrorLog.Severity.LOW

    @staticmethod
    def capture(exc, request, response=None, status_code=500, service='backend'):
        """
        Write (or increment) an ErrorLog entry.
        Deduplication: if an unresolved entry with the same (path, code)
        exists within DEDUP_WINDOW_MINUTES, increment occurrence_count.
        Never raises.
        """
        try:
            import traceback as tb
            from django.db import models as db_models
            from django.utils import timezone
            from django.conf import settings as django_settings
            from saas_platform.audit.models import ErrorLog

            code = str(getattr(exc, 'default_code', None) or 'INTERNAL_ERROR')[:50]
            path = str(getattr(request, 'path', '') or '')
            method = str(getattr(request, 'method', '') or '')
            request_id = str(getattr(request, 'request_id', '') or '')

            status = response.status_code if response is not None else status_code
            severity = ErrorLogService._severity_from_status(status)
            message = str(exc)[:500]
            user_agent = request.META.get('HTTP_USER_AGENT', '')[:512]

            academy = getattr(request, 'academy', None)
            user = getattr(request, 'user', None)
            if user and not getattr(user, 'is_authenticated', False):
                user = None
            role = getattr(user, 'role', '') if user else ''

            stacktrace = ''
            if not getattr(django_settings, 'IS_PRODUCTION', False):
                stacktrace = tb.format_exc()[:10_000]

            window_start = timezone.now() - timedelta(minutes=DEDUP_WINDOW_MINUTES)
            existing = ErrorLog.objects.filter(
                path=path,
                code=code,
                is_resolved=False,
                created_at__gte=window_start,
            ).first()

            if existing:
                ErrorLog.objects.filter(pk=existing.pk).update(
                    occurrence_count=db_models.F('occurrence_count') + 1,
                )
            else:
                ErrorLog.objects.create(
                    request_id=request_id,
                    path=path,
                    method=method,
                    status_code=status,
                    code=code,
                    message=message,
                    stacktrace=stacktrace,
                    academy=academy,
                    user=user,
                    role=role,
                    service=service,
                    severity=severity,
                    user_agent=user_agent,
                    environment=getattr(django_settings, 'ENVIRONMENT', 'development'),
                )
        except Exception:
            _logging.getLogger(__name__).exception(
                'ErrorLogService.capture failed silently'
            )

    @staticmethod
    def resolve(error_log_id: int, resolved_by_user):
        """Mark an ErrorLog as resolved."""
        from django.utils import timezone as tz
        from saas_platform.audit.models import ErrorLog
        updated = ErrorLog.objects.filter(
            pk=error_log_id, is_resolved=False
        ).update(
            is_resolved=True,
            resolved_by=resolved_by_user,
            resolved_at=tz.now(),
        )
        return updated > 0


def get_client_ip(request):
    """Extract client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def _make_json_serializable(obj):
    """Convert Decimal and other non-serializable objects to JSON-serializable types."""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: _make_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [_make_json_serializable(item) for item in obj]
    elif isinstance(obj, (str, int, float, bool, type(None))):
        return obj
    else:
        return str(obj)
