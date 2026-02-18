from django.db import transaction
from django.utils import timezone
from saas_platform.quotas.models import TenantQuota
from saas_platform.subscriptions.models import Subscription, SubscriptionStatus


class QuotaService:
    """Service for quota calculation and management."""
    
    @staticmethod
    def calculate_effective_quota(academy):
        """
        Calculate effective quota limits for an academy.
        
        Merges Plan.limits_json with Subscription.overrides_json.
        Returns dict with all quota keys and their effective limits.
        """
        subscription = Subscription.objects.filter(
            academy=academy,
            is_current=True
        ).select_related('plan').first()
        
        if not subscription:
            return None
        
        # Start with plan defaults
        effective = subscription.plan.limits_json.copy()
        
        # Apply subscription overrides (overrides win)
        effective.update(subscription.overrides_json)
        
        return effective
    
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
                    'max_students': 0,
                    'max_coaches': 0,
                    'max_admins': 0,
                    'max_classes': 0,
                }
            )
            return
        
        # Update or create TenantQuota with effective limits
        TenantQuota.objects.update_or_create(
            academy=academy,
            defaults={
                'storage_bytes_limit': effective_quota.get('storage_bytes', 0),
                'max_students': effective_quota.get('max_students', 0),
                'max_coaches': effective_quota.get('max_coaches', 0),
                'max_admins': effective_quota.get('max_admins', 0),
                'max_classes': effective_quota.get('max_classes', 0),
            }
        )
