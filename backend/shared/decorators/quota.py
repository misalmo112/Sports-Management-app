"""
Quota enforcement decorator for ViewSet methods.

This decorator checks quota limits before allowing create operations.
"""
from functools import wraps
from rest_framework.response import Response
from rest_framework import status
from saas_platform.quotas.services import QuotaService
from saas_platform.quotas.models import TenantUsage
from shared.services.quota import _get_count_usage as _get_cached_count_usage


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

            # Soft warning support only for storage.
            current_pct = None
            warning_pct = None
            if quota_type == 'storage_bytes':
                quota = getattr(request.academy, 'quota', None)
                warning_pct = getattr(quota, 'storage_warning_threshold_pct', 80)
                if warning_pct is None:
                    warning_pct = 80

                if limit > 0:
                    current_pct = round((current_usage / float(limit)) * 100.0, 2)
                else:
                    # Treat storage_bytes_limit <= 0 as unlimited.
                    current_pct = 0.0

                # Hard block before calling the wrapped function.
                if limit > 0 and new_usage > limit:
                    return Response(
                        {
                            'detail': 'Storage quota exceeded.',
                            'quota_type': quota_type,
                            'current_usage': current_usage,
                            'limit': limit,
                            'requested': requested_increment,
                            'storage_status': 'exceeded',
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

            else:
                # Existing hard-block behavior for count-based quotas.
                if new_usage > limit:
                    return Response(
                        {
                            'detail': 'Quota exceeded',
                            'quota_type': quota_type,
                            'current_usage': current_usage,
                            'limit': limit,
                            'requested': requested_increment,
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

            response = func(self, request, *args, **kwargs)

            # Emit warning headers only after successful wrapped call.
            if quota_type == 'storage_bytes' and limit > 0 and current_pct is not None:
                if current_pct >= float(warning_pct):
                    if hasattr(response, 'headers'):
                        response.headers['X-Storage-Status'] = 'warning'
                        response.headers['X-Storage-Usage-Pct'] = f'{current_pct:.2f}'
                        response.headers[
                            'X-Storage-Warning'
                        ] = (
                            f'Storage usage is at {current_pct:.2f}% '
                            f'(warning threshold: {int(warning_pct)}%).'
                        )

            return response
        
        return wrapper
    return decorator


def _get_count_usage(academy, quota_type):
    """Get current count usage for a quota type."""
    return _get_cached_count_usage(academy, quota_type)
