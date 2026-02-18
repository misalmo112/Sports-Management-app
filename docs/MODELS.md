# Platform Layer Models

## Overview

This document defines the canonical Django models for the platform layer of the Sports Academy Management System. These models handle tenant (academy) management, subscriptions, plans, quotas, usage tracking, and onboarding state.

**Critical Rule**: Platform layer models MUST NOT contain tenant business logic. All tenant-specific data (students, classes, coaches, etc.) belongs in the tenant layer.

## Model Definitions

### Academy

Core tenant entity representing a sports academy or training center.

```python
from django.db import models
import uuid

class Academy(models.Model):
    """Core tenant entity for a sports academy."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    
    # Contact Information
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)
    
    # Address
    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True)
    timezone = models.CharField(max_length=50, default='UTC')
    
    # Onboarding Status
    onboarding_completed = models.BooleanField(default=False, db_index=True)
    
    # Customer Organization (optional, for multi-academy billing)
    # TODO: Implement CustomerOrg model if multi-academy billing is needed
    # customer_org = models.ForeignKey(
    #     'CustomerOrg',
    #     on_delete=models.SET_NULL,
    #     null=True,
    #     blank=True,
    #     related_name='academies'
    # )
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'academies'
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['onboarding_completed', 'is_active']),
        ]
        verbose_name_plural = 'Academies'
    
    def __str__(self):
        return self.name
```

**Key Fields:**
- `id`: UUID primary key for security
- `slug`: Unique identifier for URLs
- `onboarding_completed`: Blocks tenant APIs if False
- `is_active`: Soft delete flag
- `timezone`: Academy's timezone for date/time operations

**Relationships:**
- OneToMany → Subscription (historical subscriptions)
- OneToOne → TenantUsage
- OneToOne → OnboardingState
- Optional ForeignKey → CustomerOrg (future)

---

### CustomerOrg (Optional)

Customer account/organization model for multi-academy billing scenarios.

```python
# TODO: Implement if multi-academy billing is required
# This allows one customer to own multiple academies with unified billing

class CustomerOrg(models.Model):
    """Customer organization for multi-academy billing."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    
    # Billing Information
    billing_email = models.EmailField()
    billing_phone = models.CharField(max_length=20, blank=True)
    billing_address_line1 = models.CharField(max_length=255, blank=True)
    billing_address_line2 = models.CharField(max_length=255, blank=True)
    billing_city = models.CharField(max_length=100, blank=True)
    billing_state = models.CharField(max_length=100, blank=True)
    billing_postal_code = models.CharField(max_length=20, blank=True)
    billing_country = models.CharField(max_length=100, blank=True)
    
    # Company Details
    tax_id = models.CharField(max_length=50, blank=True)
    company_registration_number = models.CharField(max_length=50, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customer_orgs'
        verbose_name = 'Customer Organization'
        verbose_name_plural = 'Customer Organizations'
    
    def __str__(self):
        return self.name
```

**Note**: This model is optional. If not implementing initially, keep Academy billing at the academy level and add a TODO note.

---

### Plan

Subscription tier definitions with pricing, trial periods, and default quota limits.

```python
from django.contrib.postgres.fields import JSONField

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
    
    def __str__(self):
        return self.name
```

**Key Fields:**
- `limits_json`: Default quota limits for all quotas (storage, students, coaches, admins, classes)
- `trial_days`: Number of days for trial period
- `seat_based_pricing`: If True, pricing is per admin user
- `is_public`: Whether plan is visible to customers

**Quota Structure in limits_json:**
```json
{
  "storage_bytes": 10737418240,
  "max_students": 100,
  "max_coaches": 10,
  "max_admins": 5,
  "max_classes": 50
}
```

---

### Subscription

Links Academy to Plan, tracks subscription status, billing dates, and quota overrides.

```python
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
        'Academy',
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
    
    def __str__(self):
        return f"{self.academy.name} - {self.plan.name} ({self.status})"
```

**Key Fields:**
- `is_current`: Boolean flag indicating current subscription (only one per academy)
- `overrides_json`: Quota overrides that take precedence over Plan.limits_json
- `status`: Subscription status enum (TRIAL, ACTIVE, PAST_DUE, CANCELED, SUSPENDED, EXPIRED)
- `start_at`, `end_at`: Billing period dates

**Relationships:**
- ForeignKey → Academy (OneToMany: historical subscriptions)
- ForeignKey → Plan

**Quota Resolution:**
Effective quotas = `Plan.limits_json` merged with `Subscription.overrides_json` (overrides win)

**Database Constraint:**
Unique constraint ensures only one `is_current=True` subscription per academy.

---

### TenantUsage

Real-time usage tracking per Academy for all quota types.

```python
class TenantUsage(models.Model):
    """Real-time usage tracking for academy quotas."""
    
    id = models.AutoField(primary_key=True)
    academy = models.OneToOneField(
        'Academy',
        on_delete=models.CASCADE,
        related_name='usage'
    )
    
    # Storage Usage (bytes)
    # Updated atomically on upload/delete with select_for_update()
    storage_used_bytes = models.BigIntegerField(default=0, db_index=True)
    
    # Count Usage (computed on-demand or cached periodically)
    students_count = models.IntegerField(default=0, db_index=True)
    coaches_count = models.IntegerField(default=0, db_index=True)
    admins_count = models.IntegerField(default=0, db_index=True)
    classes_count = models.IntegerField(default=0, db_index=True)
    
    # Last computed timestamp (for count quotas)
    counts_computed_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_usages'
        verbose_name = 'Tenant Usage'
        verbose_name_plural = 'Tenant Usages'
    
    def __str__(self):
        return f"Usage for {self.academy.name}"
```

**Key Fields:**
- `storage_used_bytes`: Authoritative storage usage, updated atomically
- `students_count`, `coaches_count`, `admins_count`, `classes_count`: Cached counts
- `counts_computed_at`: Timestamp of last count computation

**Update Mechanism:**
- **Storage**: Updated atomically in transaction with `select_for_update()` on upload/delete
- **Counts**: Computed on-demand via indexed DB counts or cached periodically

**Usage Example:**
```python
from django.db import transaction

# Atomic storage update
with transaction.atomic():
    usage = TenantUsage.objects.select_for_update().get(academy=academy)
    usage.storage_used_bytes += file_size
    usage.save()
```

---

### OnboardingState

Tracks onboarding wizard progress, current step, and completion status.

```python
from django.contrib.auth import get_user_model

User = get_user_model()

class OnboardingState(models.Model):
    """Tracks onboarding wizard progress for an academy."""
    
    id = models.AutoField(primary_key=True)
    academy = models.OneToOneField(
        'Academy',
        on_delete=models.CASCADE,
        related_name='onboarding_state'
    )
    
    # Current Step (1-6)
    # 1: Academy Profile
    # 2: Location
    # 3: Sports
    # 4: Age Categories
    # 5: Terms
    # 6: Pricing
    current_step = models.IntegerField(default=1, db_index=True)
    
    # Completion Status
    is_completed = models.BooleanField(default=False, db_index=True)
    
    # Concurrency Control
    # Prevents multiple admins from running wizard simultaneously
    locked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='locked_onboarding_states'
    )
    locked_at = models.DateTimeField(null=True, blank=True)
    
    # Completion Tracking
    completed_by_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='completed_onboarding_states'
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Step Completion Flags (for validation)
    step_1_completed = models.BooleanField(default=False)  # Profile
    step_2_completed = models.BooleanField(default=False)  # Location
    step_3_completed = models.BooleanField(default=False)  # Sports
    step_4_completed = models.BooleanField(default=False)  # Age Categories
    step_5_completed = models.BooleanField(default=False)  # Terms
    step_6_completed = models.BooleanField(default=False)  # Pricing
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'onboarding_states'
        indexes = [
            models.Index(fields=['academy', 'is_completed']),
            models.Index(fields=['current_step']),
        ]
    
    def __str__(self):
        return f"Onboarding for {self.academy.name} - Step {self.current_step}"
```

**Key Fields:**
- `current_step`: Current step number (1-6)
- `locked_by`: User who has locked the wizard (prevents concurrent runs)
- `completed_by_user`, `completed_at`: Tracks who completed and when
- `step_X_completed`: Boolean flags for each step completion

**Concurrency Control:**
- `locked_by` prevents multiple admins from running wizard simultaneously
- Lock is acquired when wizard starts, released on completion or timeout

---

## Model Relationships Summary

```
Academy (UUID PK)
  ├── OneToMany → Subscription (historical subscriptions)
  ├── OneToOne → TenantUsage
  ├── OneToOne → OnboardingState
  └── Optional ForeignKey → CustomerOrg (future)

Plan (Integer PK)
  ├── JSONField → limits_json (default quotas)
  └── OneToMany → Subscription

Subscription (Integer PK)
  ├── ForeignKey → Academy
  ├── ForeignKey → Plan
  └── JSONField → overrides_json (quota overrides)

TenantUsage (Integer PK)
  └── OneToOne → Academy

OnboardingState (Integer PK)
  ├── OneToOne → Academy
  ├── ForeignKey → User (locked_by)
  └── ForeignKey → User (completed_by_user)
```

## Database Constraints

1. **Unique Current Subscription**: Only one `is_current=True` subscription per academy
2. **Academy Slug**: Unique across all academies
3. **Plan Slug**: Unique across all plans
4. **Onboarding State**: One per academy (OneToOne)

## Indexes

All models include indexes on:
- Foreign keys
- Frequently queried fields (`onboarding_completed`, `is_active`, `status`, `is_current`)
- Composite indexes for common query patterns

## Timestamps

All models include:
- `created_at`: Auto-set on creation
- `updated_at`: Auto-updated on save

All timestamps are stored in UTC.

## Soft Deletes

Models use `is_active` flags for soft deletes:
- `Academy.is_active`
- `Plan.is_active`
- `CustomerOrg.is_active` (if implemented)

Queries should filter by `is_active=True` unless explicitly including deleted records.

## Quota Resolution Logic

Effective quota limits are calculated as:

```python
def get_effective_quota(academy):
    """Get effective quota limits for an academy."""
    subscription = academy.subscriptions.filter(is_current=True).first()
    if not subscription:
        return None
    
    # Start with plan defaults
    effective = subscription.plan.limits_json.copy()
    
    # Apply subscription overrides (overrides win)
    effective.update(subscription.overrides_json)
    
    return effective
```

## Migration Considerations

1. **UUID Primary Keys**: Academy uses UUID, others use Integer
2. **JSON Fields**: Use PostgreSQL JSONField (not TextField)
3. **Unique Constraints**: Add database-level constraints for data integrity
4. **Indexes**: Add indexes after data migration for performance

## Best Practices

1. **Always Filter by Academy**: Tenant queries must filter by `academy_id`
2. **Use select_for_update()**: For storage updates to prevent race conditions
3. **Atomic Updates**: Use transactions for quota updates
4. **Validate Quotas**: Check quotas before allowing operations
5. **Track Usage**: Keep TenantUsage.storage_used_bytes authoritative
6. **Compute Counts**: Use indexed counts or cache for count quotas
