from saas_platform.audit.models import AuditLog, AuditAction, ResourceType
from decimal import Decimal
import json


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
        request=None
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
            
        Returns:
            AuditLog instance
        """
        ip_address = None
        user_agent = ''
        
        if request:
            ip_address = get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Convert Decimal values to strings for JSON serialization
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
        )
        
        return audit_log


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
