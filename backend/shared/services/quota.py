"""
Quota check helper functions for reusable quota validation.
"""
from django.conf import settings
from rest_framework.exceptions import ValidationError
from saas_platform.quotas.services import QuotaService
from saas_platform.quotas.models import TenantUsage
from shared.cache_keys import build_count_usage_cache_key, safe_cache_get, safe_cache_set, QUOTA_COUNT_TTL


# Single source of truth for count-usage cache TTL.
QUOTA_COUNT_CACHE_TIMEOUT_SECONDS = QUOTA_COUNT_TTL
_CACHE_MISS = "__quota_count_cache_miss__"


class QuotaExceededError(ValidationError):
    """Exception raised when quota is exceeded."""
    
    def __init__(self, quota_type, current_usage, limit, requested=1):
        self.quota_type = quota_type
        self.current_usage = current_usage
        self.limit = limit
        self.requested = requested
        detail = f"Quota exceeded for {quota_type}. Current: {current_usage}, Limit: {limit}, Requested: {requested}"
        super().__init__(detail)


def check_quota_before_create(academy, quota_type, requested_increment=1):
    """
    Check quota before creating a new resource.
    
    Args:
        academy: Academy instance
        quota_type: One of 'students', 'coaches', 'classes', 'admins', 'storage_bytes'
        requested_increment: Amount to add (for storage: bytes, for counts: 1)
    
    Returns:
        tuple: (allowed: bool, current_usage: int, limit: int)
    
    Raises:
        QuotaExceededError: If quota would be exceeded
    """
    # Get effective quota
    effective_quota = QuotaService.calculate_effective_quota(academy)
    if not effective_quota:
        raise QuotaExceededError(
            quota_type='subscription',
            current_usage=0,
            limit=0
        )
    
    # Determine quota limit key
    if quota_type == 'storage_bytes':
        limit_key = 'storage_bytes'
    else:
        limit_key = f'max_{quota_type}'
    
    limit = effective_quota.get(limit_key, 0)
    
    # Get current usage
    if quota_type == 'storage_bytes':
        try:
            usage = TenantUsage.objects.get(academy=academy)
            current_usage = usage.storage_used_bytes
        except TenantUsage.DoesNotExist:
            current_usage = 0
    else:
        current_usage = _get_count_usage(academy, quota_type)
    
    # Check if operation would exceed limit
    new_usage = current_usage + requested_increment
    
    if new_usage > limit:
        raise QuotaExceededError(
            quota_type=quota_type,
            current_usage=current_usage,
            limit=limit,
            requested=requested_increment
        )
    
    return True, current_usage, limit


def _get_count_usage(academy, quota_type):
    """Get current count usage for a quota type."""
    cache_key = build_count_usage_cache_key(academy.id, quota_type)
    cached_value = safe_cache_get(cache_key, _CACHE_MISS)
    if cached_value != _CACHE_MISS:
        return cached_value

    usage_count = 0
    if quota_type == 'students':
        from tenant.students.models import Student
        usage_count = Student.objects.filter(academy=academy, is_active=True).count()
    elif quota_type == 'coaches':
        from tenant.coaches.models import Coach
        usage_count = Coach.objects.filter(academy=academy, is_active=True).count()
    elif quota_type == 'classes':
        from tenant.classes.models import Class
        usage_count = Class.objects.filter(academy=academy, is_active=True).count()
    elif quota_type == 'admins':
        from django.contrib.auth import get_user_model
        User = get_user_model()
        if hasattr(User, 'objects'):
            usage_count = User.objects.filter(
                academy_id=academy.id,
                role__in=['OWNER', 'ADMIN', 'STAFF'],
                is_active=True
            ).count()
    safe_cache_set(cache_key, usage_count, timeout=QUOTA_COUNT_CACHE_TIMEOUT_SECONDS)
    return usage_count
