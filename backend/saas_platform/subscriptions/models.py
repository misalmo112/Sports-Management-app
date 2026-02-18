from django.db import models
from django.utils import timezone


class Plan(models.Model):
    """Subscription plan/tier definition."""
    
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True)
    
    # Pricing
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default='USD')
    
    # Trial Period
    trial_days = models.IntegerField(default=0)
    
    # Default Quota Limits (stored as JSON)
    # Structure: {
    #   "storage_bytes": 10737418240,  # 10GB in bytes
    #   "max_students": 100,
    #   "max_coaches": 10,
    #   "max_admins": 5,
    #   "max_classes": 50
    # }
    limits_json = models.JSONField(default=dict)
    
    # Seat-based Pricing (optional)
    # If True, price_monthly is per admin user
    seat_based_pricing = models.BooleanField(default=False)
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    is_public = models.BooleanField(default=True, db_index=True)  # Visible to customers
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'plans'
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active', 'is_public']),
        ]
        verbose_name = 'Plan'
        verbose_name_plural = 'Plans'
    
    def __str__(self):
        return self.name


class SubscriptionStatus(models.TextChoices):
    TRIAL = 'TRIAL', 'Trial'
    ACTIVE = 'ACTIVE', 'Active'
    PAST_DUE = 'PAST_DUE', 'Past Due'
    CANCELED = 'CANCELED', 'Canceled'
    SUSPENDED = 'SUSPENDED', 'Suspended'
    EXPIRED = 'EXPIRED', 'Expired'


class Subscription(models.Model):
    """Academy subscription to a plan (historical)."""
    
    id = models.AutoField(primary_key=True)
    academy = models.ForeignKey(
        'tenants.Academy',
        on_delete=models.CASCADE,
        related_name='subscriptions'
    )
    plan = models.ForeignKey(
        'Plan',
        on_delete=models.PROTECT,
        related_name='subscriptions'
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.TRIAL,
        db_index=True
    )
    
    # Current Subscription Flag
    # Database constraint ensures only one current subscription per academy
    is_current = models.BooleanField(default=True, db_index=True)
    
    # Billing Dates
    start_at = models.DateTimeField(db_index=True)
    end_at = models.DateTimeField(null=True, blank=True, db_index=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    
    # Quota Overrides (stored as JSON, only stores overrides)
    # Structure: {
    #   "storage_bytes": 21474836480,  # Override: 20GB instead of plan default
    #   "max_students": 200  # Override: 200 students instead of plan default
    # }
    # Only include keys that differ from Plan.limits_json
    overrides_json = models.JSONField(default=dict, blank=True)
    
    # Cancellation
    canceled_at = models.DateTimeField(null=True, blank=True)
    cancel_reason = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'subscriptions'
        indexes = [
            models.Index(fields=['academy', 'is_current']),
            models.Index(fields=['status', 'is_current']),
            models.Index(fields=['start_at', 'end_at']),
        ]
        constraints = [
            # Ensure only one current subscription per academy
            models.UniqueConstraint(
                fields=['academy'],
                condition=models.Q(is_current=True),
                name='unique_current_subscription_per_academy'
            )
        ]
        verbose_name = 'Subscription'
        verbose_name_plural = 'Subscriptions'
    
    def __str__(self):
        return f"{self.academy.name} - {self.plan.name} ({self.status})"
