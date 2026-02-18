"""
Quota enforcement decorator for ViewSet methods.

This decorator checks quota limits before allowing create operations.
"""
from functools import wraps
from rest_framework.response import Response
from rest_framework import status
from saas_platform.quotas.services import QuotaService
from saas_platform.quotas.models import TenantUsage


def check_quota(quota_type):
    """
    Decorator to check quota before allowing operation.
    
    Args:
        quota_type: One of 'students', 'coaches', 'classes', 'admins', 'storage_bytes'
    
    Usage:
        @check_quota('students')
        def create(self, request, *args, **kwargs):
            return super().create(request, *args, **kwargs)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            if not hasattr(request, 'academy') or not request.academy:
                return Response(
                    {'detail': 'Academy not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get effective quota
            effective_quota = QuotaService.calculate_effective_quota(request.academy)
            if not effective_quota:
                return Response(
                    {
                        'detail': 'No active subscription found',
                        'academy_id': str(request.academy.id)
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Determine quota limit key
            if quota_type == 'storage_bytes':
                limit_key = 'storage_bytes'
            else:
                limit_key = f'max_{quota_type}'
            
            limit = effective_quota.get(limit_key, 0)
            
            # Get current usage
            if quota_type == 'storage_bytes':
                # For storage, use TenantUsage model
                try:
                    usage = TenantUsage.objects.get(academy=request.academy)
                    current_usage = usage.storage_used_bytes
                except TenantUsage.DoesNotExist:
                    current_usage = 0
            else:
                # For counts, get on-demand count
                current_usage = _get_count_usage(request.academy, quota_type)
            
            # Determine requested increment
            requested_increment = 1  # Default for counts
            if quota_type == 'storage_bytes':
                # Extract file size from request
                if hasattr(request, 'FILES') and request.FILES:
                    requested_increment = sum(
                        f.size for f in request.FILES.values()
                    )
            
            # Check if operation would exceed limit
            new_usage = current_usage + requested_increment
            
            if new_usage > limit:
                return Response(
                    {
                        'detail': 'Quota exceeded',
                        'quota_type': quota_type,
                        'current_usage': current_usage,
                        'limit': limit,
                        'requested': requested_increment
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
            
            return func(self, request, *args, **kwargs)
        
        return wrapper
    return decorator


def _get_count_usage(academy, quota_type):
    """Get current count usage for a quota type."""
    try:
        if quota_type == 'students':
            from tenant.students.models import Student
            # Use values_list to avoid potential query issues
            return Student.objects.filter(academy=academy).filter(is_active=True).count()
        elif quota_type == 'coaches':
            from tenant.coaches.models import Coach
            return Coach.objects.filter(academy=academy).filter(is_active=True).count()
        elif quota_type == 'classes':
            from tenant.classes.models import Class
            return Class.objects.filter(academy=academy).filter(is_active=True).count()
        elif quota_type == 'admins':
            from django.contrib.auth import get_user_model
            User = get_user_model()
            return User.objects.filter(
                academy_id=academy.id,
                role__in=['OWNER', 'ADMIN']
            ).filter(is_active=True).count()
        else:
            return 0
    except Exception:
        # If there's any error counting, return 0 to allow the operation
        # This prevents quota check from blocking operations due to database issues
        return 0
