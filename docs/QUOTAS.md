# Quota Enforcement Rules

## Overview

This document defines the quota enforcement rules for the Sports Academy Management System. Quotas limit resource usage per academy and are enforced at the API level with hard blocks when limits are exceeded.

**Critical Rule**: Quotas are enforced at the API level, not just in the UI. No soft warnings beyond 100% - operations are blocked when quotas are exceeded.

## Quota Types

The system tracks the following quota types:

1. **Storage (bytes)**: Total file storage used by the academy
2. **Students**: Maximum number of student records
3. **Coaches**: Maximum number of coach users
4. **Admins**: Maximum number of admin/owner users
5. **Classes**: Maximum number of class records

## Quota Storage Structure

### Plan Defaults

Default quota limits are stored in `Plan.limits_json`:

```json
{
  "storage_bytes": 10737418240,
  "max_students": 100,
  "max_coaches": 10,
  "max_admins": 5,
  "max_classes": 50
}
```

**Structure**:
- `storage_bytes`: Integer, total storage in bytes (e.g., 10737418240 = 10GB)
- `max_students`: Integer, maximum number of students
- `max_coaches`: Integer, maximum number of coaches
- `max_admins`: Integer, maximum number of admin/owner users
- `max_classes`: Integer, maximum number of classes

### Subscription Overrides

Quota overrides are stored in `Subscription.overrides_json`:

```json
{
  "storage_bytes": 21474836480,
  "max_students": 200
}
```

**Key Points**:
- Only stores overrides (keys that differ from plan defaults)
- Empty object `{}` means no overrides (use plan defaults)
- Overrides take precedence over plan defaults

### Effective Quota Calculation

Effective quotas are calculated by merging plan defaults with subscription overrides:

```python
def get_effective_quota(academy):
    """
    Get effective quota limits for an academy.
    
    Returns dict with all quota keys and their effective limits.
    """
    subscription = academy.subscriptions.filter(is_current=True).first()
    if not subscription:
        return None
    
    # Start with plan defaults
    effective = subscription.plan.limits_json.copy()
    
    # Apply subscription overrides (overrides win)
    effective.update(subscription.overrides_json)
    
    return effective
```

**Resolution Order**:
1. Start with `Plan.limits_json` (defaults)
2. Merge `Subscription.overrides_json` (overrides win)
3. Return merged result

**Example**:
```python
# Plan defaults
plan_limits = {
    "storage_bytes": 10737418240,  # 10GB
    "max_students": 100,
    "max_coaches": 10,
    "max_admins": 5,
    "max_classes": 50
}

# Subscription overrides
subscription_overrides = {
    "storage_bytes": 21474836480,  # 20GB (override)
    "max_students": 200  # 200 (override)
}

# Effective quotas
effective = {
    "storage_bytes": 21474836480,  # 20GB (from override)
    "max_students": 200,  # 200 (from override)
    "max_coaches": 10,  # 10 (from plan default)
    "max_admins": 5,  # 5 (from plan default)
    "max_classes": 50  # 50 (from plan default)
}
```

## Usage Tracking

### TenantUsage Model

Usage is tracked in the `TenantUsage` model (OneToOne with Academy):

```python
class TenantUsage(models.Model):
    academy = models.OneToOneField('Academy', ...)
    
    # Storage (authoritative, updated atomically)
    storage_used_bytes = models.BigIntegerField(default=0)
    
    # Counts (computed on-demand or cached)
    students_count = models.IntegerField(default=0)
    coaches_count = models.IntegerField(default=0)
    admins_count = models.IntegerField(default=0)
    classes_count = models.IntegerField(default=0)
    
    counts_computed_at = models.DateTimeField(null=True, blank=True)
```

### Storage Usage Updates

**Update Mechanism**: Atomic updates with `select_for_update()`

**When Updated**:
- On file upload: Increment `storage_used_bytes` by file size
- On file delete: Decrement `storage_used_bytes` by file size
- On file update: Adjust by size difference

**Implementation Pattern**:
```python
from django.db import transaction

def update_storage_usage(academy, file_size_delta):
    """Atomically update storage usage."""
    with transaction.atomic():
        usage = TenantUsage.objects.select_for_update().get(academy=academy)
        usage.storage_used_bytes += file_size_delta
        
        # Prevent negative storage
        if usage.storage_used_bytes < 0:
            usage.storage_used_bytes = 0
        
        usage.save()
```

**Critical**: Use `select_for_update()` to prevent race conditions when multiple uploads occur simultaneously.

### Count Usage Updates

**Update Mechanism**: Computed on-demand or cached periodically

**Options**:
1. **On-Demand**: Query database with indexed counts (recommended for small-medium academies)
2. **Cached**: Update counts periodically via background task (recommended for large academies)

**On-Demand Implementation**:
```python
def get_students_count(academy):
    """Get current students count (on-demand)."""
    return Student.objects.filter(academy=academy, is_active=True).count()

def get_coaches_count(academy):
    """Get current coaches count (on-demand)."""
    return User.objects.filter(
        academy=academy,
        role__in=['COACH'],
        is_active=True
    ).count()

def get_admins_count(academy):
    """Get current admins count (on-demand)."""
    return User.objects.filter(
        academy=academy,
        role__in=['OWNER', 'ADMIN'],
        is_active=True
    ).count()

def get_classes_count(academy):
    """Get current classes count (on-demand)."""
    return Class.objects.filter(academy=academy, is_active=True).count()
```

**Cached Implementation** (Periodic Update):
```python
from django.db import transaction
from django.utils import timezone

def update_count_quotas(academy):
    """Update cached count quotas."""
    with transaction.atomic():
        usage = TenantUsage.objects.select_for_update().get(academy=academy)
        
        usage.students_count = Student.objects.filter(
            academy=academy, is_active=True
        ).count()
        
        usage.coaches_count = User.objects.filter(
            academy=academy,
            role__in=['COACH'],
            is_active=True
        ).count()
        
        usage.admins_count = User.objects.filter(
            academy=academy,
            role__in=['OWNER', 'ADMIN'],
            is_active=True
        ).count()
        
        usage.classes_count = Class.objects.filter(
            academy=academy, is_active=True
        ).count()
        
        usage.counts_computed_at = timezone.now()
        usage.save()
```

**Recommendation**: Use on-demand for counts (fast with indexes), atomic updates for storage.

## Enforcement Points

### API-Level Enforcement

Quotas are enforced at the API level before operations:

1. **Create Operations**: Check quota before creating new records
2. **Update Operations**: Check quota before updating (e.g., file size changes)
3. **Bulk Operations**: Check quota for entire batch before processing

### Enforcement Logic

**Hard Block Rule**: Operations are **blocked** when usage >= limit (100% or more)

**No Soft Warnings**: System does not allow operations beyond 100% quota

**Enforcement Pattern**:
```python
def check_quota(academy, quota_type, requested_increment=1):
    """
    Check if quota allows operation.
    
    Args:
        academy: Academy instance
        quota_type: One of 'storage_bytes', 'students', 'coaches', 'admins', 'classes'
        requested_increment: Amount to add (for storage: bytes, for counts: 1)
    
    Returns:
        tuple: (allowed: bool, current_usage: int, limit: int)
    """
    # Get effective quota
    effective_quota = get_effective_quota(academy)
    if not effective_quota:
        return False, 0, 0
    
    limit = effective_quota.get(f'max_{quota_type}', 0)
    if quota_type == 'storage_bytes':
        limit = effective_quota.get('storage_bytes', 0)
    
    # Get current usage
    usage = TenantUsage.objects.get(academy=academy)
    
    if quota_type == 'storage_bytes':
        current_usage = usage.storage_used_bytes
    elif quota_type == 'students':
        current_usage = get_students_count(academy)  # On-demand
    elif quota_type == 'coaches':
        current_usage = get_coaches_count(academy)  # On-demand
    elif quota_type == 'admins':
        current_usage = get_admins_count(academy)  # On-demand
    elif quota_type == 'classes':
        current_usage = get_classes_count(academy)  # On-demand
    else:
        return False, 0, 0
    
    # Check if operation would exceed limit
    new_usage = current_usage + requested_increment
    
    if new_usage > limit:
        return False, current_usage, limit
    
    return True, current_usage, limit
```

## Enforcement Implementation

### Decorator Pattern

```python
# shared/decorators/quota.py
from functools import wraps
from rest_framework.response import Response
from rest_framework import status

def check_quota(quota_type):
    """Decorator to check quota before allowing operation."""
    
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            if not hasattr(request, 'academy') or not request.academy:
                return Response(
                    {'detail': 'Academy not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Determine requested increment
            requested_increment = 1  # Default for counts
            if quota_type == 'storage_bytes':
                # Extract file size from request
                if hasattr(request, 'FILES'):
                    requested_increment = sum(
                        f.size for f in request.FILES.values()
                    )
            
            # Check quota
            allowed, current_usage, limit = check_quota(
                request.academy,
                quota_type,
                requested_increment
            )
            
            if not allowed:
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
```

### ViewSet Usage

```python
# tenant/students/views.py
from shared.decorators.quota import check_quota

class StudentViewSet(viewsets.ModelViewSet):
    # ... other code ...
    
    @check_quota('students')
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
```

### Service Layer Usage

```python
# tenant/students/services.py
from shared.quotas.services import QuotaService

class StudentService:
    def create_student(self, academy, student_data):
        # Check quota
        quota_service = QuotaService(academy)
        if not quota_service.check_quota('students', increment=1):
            raise QuotaExceededError(
                quota_type='students',
                current=quota_service.get_usage('students'),
                limit=quota_service.get_limit('students')
            )
        
        # Create student
        student = Student.objects.create(
            academy=academy,
            **student_data
        )
        
        return student
```

## Storage Quota Special Handling

### File Upload Enforcement

Storage quota is enforced **before** file upload:

1. Check quota before accepting upload
2. If quota allows, proceed with upload
3. Update `TenantUsage.storage_used_bytes` atomically after successful upload
4. If upload fails, do not update usage

**Implementation**:
```python
# tenant/media/views.py
from django.db import transaction

class MediaUploadView(APIView):
    @check_quota('storage_bytes')
    def post(self, request):
        # Quota check passed, proceed with upload
        
        files = request.FILES.getlist('files')
        total_size = sum(f.size for f in files)
        
        try:
            # Upload files to S3
            uploaded_files = []
            for file in files:
                media_file = upload_to_s3(file, request.academy)
                uploaded_files.append(media_file)
            
            # Update storage usage atomically
            with transaction.atomic():
                usage = TenantUsage.objects.select_for_update().get(
                    academy=request.academy
                )
                usage.storage_used_bytes += total_size
                usage.save()
            
            return Response({'files': uploaded_files}, status=201)
        
        except Exception as e:
            # Upload failed, don't update usage
            return Response(
                {'detail': str(e)},
                status=500
            )
```

### File Delete Enforcement

Storage quota is updated **after** file delete:

1. Delete file from S3
2. Update `TenantUsage.storage_used_bytes` atomically (decrement)
3. Prevent negative storage values

**Implementation**:
```python
# tenant/media/views.py
from django.db import transaction

class MediaDeleteView(APIView):
    def delete(self, request, media_id):
        media_file = MediaFile.objects.get(
            id=media_id,
            academy=request.academy
        )
        
        file_size = media_file.size_bytes
        
        try:
            # Delete from S3
            delete_from_s3(media_file)
            
            # Delete database record
            media_file.delete()
            
            # Update storage usage atomically
            with transaction.atomic():
                usage = TenantUsage.objects.select_for_update().get(
                    academy=request.academy
                )
                usage.storage_used_bytes -= file_size
                
                # Prevent negative storage
                if usage.storage_used_bytes < 0:
                    usage.storage_used_bytes = 0
                
                usage.save()
            
            return Response(status=204)
        
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=500
            )
```

## Error Responses

### Quota Exceeded Response

**Status Code**: `403 Forbidden`

**Response Body**:
```json
{
  "detail": "Quota exceeded",
  "quota_type": "students",
  "current_usage": 100,
  "limit": 100,
  "requested": 1
}
```

### No Subscription Response

**Status Code**: `403 Forbidden`

**Response Body**:
```json
{
  "detail": "No active subscription found",
  "academy_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Edge Cases

### Trial Period Behavior

**Rule**: Quotas apply during trial period (same as active subscription)

**Implementation**: Trial subscriptions have same quota limits as active subscriptions. No special handling needed.

### Quota Increases

**Scenario**: Subscription is upgraded to a plan with higher quotas

**Behavior**:
1. New subscription is created with `is_current=True`
2. Old subscription is marked `is_current=False`
3. Effective quotas are recalculated from new plan/overrides
4. Operations that were blocked may now be allowed

**Implementation**:
```python
def upgrade_subscription(academy, new_plan):
    """Upgrade academy to new plan."""
    with transaction.atomic():
        # Mark old subscription as not current
        old_subscription = academy.subscriptions.filter(
            is_current=True
        ).first()
        if old_subscription:
            old_subscription.is_current = False
            old_subscription.save()
        
        # Create new subscription
        new_subscription = Subscription.objects.create(
            academy=academy,
            plan=new_plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )
    
    return new_subscription
```

### Grace Periods

**Current Behavior**: No grace periods - quotas are hard blocks

**Future Consideration**: If grace periods are needed, add `grace_period_ends_at` to Subscription model and allow operations during grace period.

### Quota Overrides

**Scenario**: Superadmin increases quota for specific academy

**Implementation**:
```python
def set_quota_override(academy, quota_type, new_limit):
    """Set quota override for academy."""
    subscription = academy.subscriptions.filter(
        is_current=True
    ).first()
    
    if not subscription:
        raise ValueError("No active subscription")
    
    # Update overrides
    overrides = subscription.overrides_json.copy()
    overrides[quota_type] = new_limit
    
    subscription.overrides_json = overrides
    subscription.save()
```

## Best Practices

1. **Check Before Operation**: Always check quota before creating/updating records
2. **Atomic Updates**: Use transactions and `select_for_update()` for storage updates
3. **On-Demand Counts**: Use indexed DB counts for count quotas (fast and accurate)
4. **Clear Errors**: Provide specific error messages with current usage and limits
5. **Consistent Enforcement**: Apply quotas consistently across all endpoints
6. **No Soft Warnings**: Hard block at 100% - no operations beyond limit
7. **Storage Authority**: Keep `TenantUsage.storage_used_bytes` as authoritative source
8. **Race Condition Prevention**: Use `select_for_update()` for concurrent updates

## Testing Quota Enforcement

### Test Examples

```python
# tenant/students/tests/test_quotas.py
from django.test import TestCase
from platform.tenants.models import Academy, Plan, Subscription
from tenant.students.models import Student

class QuotaEnforcementTests(TestCase):
    def setUp(self):
        self.academy = Academy.objects.create(name="Test Academy")
        self.plan = Plan.objects.create(
            name="Basic Plan",
            limits_json={
                "max_students": 10
            }
        )
        self.subscription = Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            is_current=True,
            status=SubscriptionStatus.ACTIVE
        )
    
    def test_quota_enforcement_blocks_exceeded_operations(self):
        # Create 10 students (at limit)
        for i in range(10):
            Student.objects.create(
                academy=self.academy,
                name=f"Student {i}"
            )
        
        # Attempt to create 11th student (should fail)
        with self.assertRaises(QuotaExceededError):
            Student.objects.create(
                academy=self.academy,
                name="Student 11"
            )
    
    def test_quota_override_takes_precedence(self):
        # Set override to 20 students
        self.subscription.overrides_json = {"max_students": 20}
        self.subscription.save()
        
        # Should allow 20 students
        for i in range(20):
            Student.objects.create(
                academy=self.academy,
                name=f"Student {i}"
            )
```

## Summary

- **Quota Types**: Storage (bytes), Students, Coaches, Admins, Classes
- **Storage**: Plan.limits_json (defaults) + Subscription.overrides_json (overrides)
- **Enforcement**: API-level hard blocks at 100%+
- **Storage Updates**: Atomic with select_for_update()
- **Count Updates**: On-demand indexed counts or cached periodically
- **No Soft Warnings**: Operations blocked when quota exceeded
- **Trial Periods**: Same quota rules as active subscriptions
