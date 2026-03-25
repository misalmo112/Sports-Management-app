from django.conf import settings
from django.db import transaction
from django.utils import timezone
from saas_platform.quotas.models import StorageSnapshot, TenantQuota
from saas_platform.subscriptions.models import Subscription
from datetime import timedelta
import math
from shared.cache_keys import (
    build_effective_quota_cache_key,
    invalidate_quota_cache,
    safe_cache_get,
    safe_cache_set,
)


QUOTA_EFFECTIVE_CACHE_TIMEOUT_SECONDS = getattr(
    settings,
    "QUOTA_EFFECTIVE_CACHE_TIMEOUT_SECONDS",
    300,
)
_CACHE_MISS = "__quota_cache_miss__"


class QuotaService:
    """Service for quota calculation and management."""
    
    @staticmethod
    def calculate_effective_quota(academy):
        """
        Calculate effective quota limits for an academy.
        
        Merges Plan.limits_json with Subscription.overrides_json.
        Returns dict with all quota keys and their effective limits.
        """
        cache_key = build_effective_quota_cache_key(academy.id)
        cached_value = safe_cache_get(cache_key, _CACHE_MISS)
        if cached_value != _CACHE_MISS:
            return cached_value

        subscription = Subscription.objects.filter(
            academy=academy,
            is_current=True
        ).select_related('plan').first()
        
        if not subscription:
            safe_cache_set(cache_key, None, timeout=QUOTA_EFFECTIVE_CACHE_TIMEOUT_SECONDS)
            return None
        
        # Start with plan defaults
        effective = subscription.plan.limits_json.copy()
        
        # Apply subscription overrides (overrides win)
        effective.update(subscription.overrides_json)
        
        safe_cache_set(cache_key, effective, timeout=QUOTA_EFFECTIVE_CACHE_TIMEOUT_SECONDS)
        return effective

    @staticmethod
    def invalidate_quota_cache(academy_id):
        invalidate_quota_cache(academy_id)
    
    @staticmethod
    @transaction.atomic
    def update_tenant_quota(academy):
        """
        Update TenantQuota model with effective quota limits.
        
        Called via signals when subscription/plan changes.
        """
        effective_quota = QuotaService.calculate_effective_quota(academy)
        
        if effective_quota is None:
            # No subscription, set all quotas to 0
            TenantQuota.objects.update_or_create(
                academy=academy,
                defaults={
                    'storage_bytes_limit': 0,
                    'storage_warning_threshold_pct': 80,
                    'max_students': 0,
                    'max_coaches': 0,
                    'max_admins': 0,
                    'max_classes': 0,
                }
            )
            QuotaService.invalidate_quota_cache(academy.id)
            return
        
        # Update or create TenantQuota with effective limits
        TenantQuota.objects.update_or_create(
            academy=academy,
            defaults={
                'storage_bytes_limit': effective_quota.get('storage_bytes', 0),
                'storage_warning_threshold_pct': effective_quota.get('storage_warning_threshold_pct', 80),
                'max_students': effective_quota.get('max_students', 0),
                'max_coaches': effective_quota.get('max_coaches', 0),
                'max_admins': effective_quota.get('max_admins', 0),
                'max_classes': effective_quota.get('max_classes', 0),
            }
        )
        QuotaService.invalidate_quota_cache(academy.id)

    @staticmethod
    def estimate_days_to_quota(academy, days_lookback: int = 14) -> int | None:
        """
        Estimate the number of days until the academy reaches its storage quota.

        Uses linear growth derived from StorageSnapshot.total_bytes within the lookback window.
        """
        if days_lookback <= 0:
            return None

        quota = getattr(academy, "quota", None)
        if not quota:
            quota = TenantQuota.objects.filter(academy=academy).first()
        if not quota:
            return None

        quota_limit = getattr(quota, "storage_bytes_limit", 0) or 0
        if quota_limit <= 0:
            return None

        since = timezone.now() - timedelta(days=days_lookback)
        snapshots_qs = (
            StorageSnapshot.objects.filter(
                academy=academy,
                recorded_at__gte=since,
            )
            .order_by("recorded_at")
            .only("recorded_at", "total_bytes")
        )

        snapshots = list(snapshots_qs)
        if len(snapshots) < 2:
            return None

        oldest = snapshots[0]
        newest = snapshots[-1]

        days_elapsed = (newest.recorded_at - oldest.recorded_at).total_seconds() / 86400.0
        if days_elapsed <= 0:
            return None

        daily_growth = (newest.total_bytes - oldest.total_bytes) / days_elapsed
        if daily_growth <= 0:
            return None

        remaining = quota_limit - newest.total_bytes
        if remaining <= 0:
            return 0

        return max(0, int(math.ceil(remaining / daily_growth)))
