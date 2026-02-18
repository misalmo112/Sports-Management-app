# Role-Permission Matrix

## Overview

This document defines the role-permission matrix and enforcement strategies for the Sports Academy Management System. All permissions are enforced at the API level, not just in the UI.

## User Roles

### Role Definitions

1. **SUPERADMIN**: Platform owner, manages the entire SaaS platform
2. **OWNER**: Owns one or more academies, full access to owned academies
3. **ADMIN**: Manages one academy, full tenant access for assigned academy
4. **COACH**: Assigned to specific classes, limited access to assigned classes only
5. **PARENT**: Parent of student(s), access to own children's data only
6. **STUDENT**: Non-authenticated entity, read-only access via parent/coach

### Role Hierarchy

```
SUPERADMIN (highest)
    ↓
OWNER
    ↓
ADMIN
    ↓
COACH
    ↓
PARENT
    ↓
STUDENT (lowest, non-auth)
```

## Permission Matrix

### Platform Layer Permissions

| Resource | SUPERADMIN | OWNER | ADMIN | COACH | PARENT | STUDENT |
|----------|------------|-------|-------|-------|--------|---------|
| **Academies** |
| List all academies | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create academy | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View any academy | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update any academy | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete academy | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Subscriptions** |
| List all subscriptions | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create subscription | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View any subscription | ✅ | View own | ❌ | ❌ | ❌ | ❌ |
| Update subscription | ✅ | Update own | ❌ | ❌ | ❌ | ❌ |
| **Plans** |
| List plans | ✅ | View available | View available | ❌ | ❌ | ❌ |
| Create/Update plan | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Quotas** |
| View all quotas | ✅ | View own | View own | ❌ | ❌ | ❌ |
| Update quotas | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Analytics** |
| Platform analytics | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Academy analytics | ✅ | View own | View own | View assigned | ❌ | ❌ |

### Tenant Layer Permissions

| Resource | SUPERADMIN | OWNER | ADMIN | COACH | PARENT | STUDENT |
|----------|------------|-------|-------|-------|--------|---------|
| **Onboarding** |
| Complete onboarding | ✅ | ✅ (own) | ✅ (assigned) | ❌ | ❌ | ❌ |
| View onboarding status | ✅ | ✅ (own) | ✅ (assigned) | ❌ | ❌ | ❌ |
| **Students** |
| List students | ✅ (all) | ✅ (own academy) | ✅ (assigned) | ✅ (assigned classes) | ✅ (own children) | ❌ |
| Create student | ✅ | ✅ | ✅ | ❌ | ✅ (own children) | ❌ |
| Update student | ✅ | ✅ | ✅ | ❌ | ✅ (own children) | ❌ |
| Delete student | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Coaches** |
| List coaches | ✅ (all) | ✅ (own academy) | ✅ (assigned) | ✅ (colleagues) | ❌ | ❌ |
| Create coach | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update coach | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete coach | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Classes** |
| List classes | ✅ (all) | ✅ (own academy) | ✅ (assigned) | ✅ (assigned) | ✅ (children's classes) | ❌ |
| Create class | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update class | ✅ | ✅ | ✅ | ✅ (assigned) | ❌ | ❌ |
| Delete class | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Enrollments** |
| List enrollments | ✅ (all) | ✅ (own academy) | ✅ (assigned) | ✅ (assigned classes) | ✅ (own children) | ❌ |
| Create enrollment | ✅ | ✅ | ✅ | ❌ | ✅ (own children) | ❌ |
| Delete enrollment | ✅ | ✅ | ✅ | ❌ | ✅ (own children) | ❌ |
| **Attendance** |
| List attendance | ✅ (all) | ✅ (own academy) | ✅ (assigned) | ✅ (assigned classes) | ✅ (own children) | ❌ |
| Mark attendance | ✅ | ✅ | ✅ | ✅ (assigned classes) | ❌ | ❌ |
| Update attendance | ✅ | ✅ | ✅ | ✅ (assigned classes) | ❌ | ❌ |
| **Billing** |
| List invoices | ✅ (all) | ✅ (own academy) | ✅ (assigned) | ❌ | ✅ (own invoices) | ❌ |
| Create invoice | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update invoice | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View payments | ✅ (all) | ✅ (own academy) | ✅ (assigned) | ❌ | ✅ (own payments) | ❌ |
| **Media** |
| List media | ✅ (all) | ✅ (own academy) | ✅ (assigned) | ✅ (assigned classes) | ✅ (own children) | ❌ |
| Upload media | ✅ | ✅ | ✅ | ✅ (assigned classes) | ✅ (own children) | ❌ |
| Delete media | ✅ | ✅ | ✅ | ✅ (own uploads) | ✅ (own uploads) | ❌ |
| **Reports** |
| Generate reports | ✅ (all) | ✅ (own academy) | ✅ (assigned) | ✅ (assigned classes) | ✅ (own children) | ❌ |
| View reports | ✅ (all) | ✅ (own academy) | ✅ (assigned) | ✅ (assigned classes) | ✅ (own children) | ❌ |

### Legend

- ✅ = Full access (create, read, update, delete)
- ✅ (condition) = Conditional access (see condition)
- ❌ = No access

## Permission Enforcement

### Django Permission Classes

#### Base Permission Classes

```python
# shared/permissions/base.py
from rest_framework import permissions

class IsSuperadmin(permissions.BasePermission):
    """Check if user is superadmin."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'SUPERADMIN'
    
    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
```

#### Platform Permission Classes

```python
# shared/permissions/platform.py
from rest_framework import permissions
from shared.permissions.base import IsSuperadmin

class IsPlatformAdmin(permissions.BasePermission):
    """Check if user can access platform resources."""
    
    def has_permission(self, request, view):
        return IsSuperadmin().has_permission(request, view)
```

#### Tenant Permission Classes

```python
# shared/permissions/tenant.py
from rest_framework import permissions
from shared.permissions.base import IsSuperadmin

class IsTenantAdmin(permissions.BasePermission):
    """Check if user is OWNER or ADMIN of the academy."""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if IsSuperadmin().has_permission(request, view):
            return True
        
        if not hasattr(request, 'academy') or not request.academy:
            return False
        
        return request.user.role in ['OWNER', 'ADMIN'] and \
               request.user.academy_id == request.academy.id
    
    def has_object_permission(self, request, view, obj):
        if IsSuperadmin().has_permission(request, view):
            return True
        
        if not hasattr(obj, 'academy'):
            return False
        
        return obj.academy_id == request.academy.id and \
               request.user.role in ['OWNER', 'ADMIN']


class IsOwner(permissions.BasePermission):
    """Check if user is OWNER of the academy."""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if IsSuperadmin().has_permission(request, view):
            return True
        
        if not hasattr(request, 'academy') or not request.academy:
            return False
        
        return request.user.role == 'OWNER' and \
               request.user.academy_id == request.academy.id


class IsCoach(permissions.BasePermission):
    """Check if user is COACH assigned to the resource."""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if IsSuperadmin().has_permission(request, view):
            return True
        
        return request.user.role == 'COACH'
    
    def has_object_permission(self, request, view, obj):
        if IsSuperadmin().has_permission(request, view):
            return True
        
        if request.user.role != 'COACH':
            return False
        
        # Check if coach is assigned to the class
        if hasattr(obj, 'class'):
            return obj.class.coach_id == request.user.id
        elif hasattr(obj, 'coach'):
            return obj.coach_id == request.user.id
        
        return False


class IsParent(permissions.BasePermission):
    """Check if user is PARENT of the student."""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        return request.user.role == 'PARENT'
    
    def has_object_permission(self, request, view, obj):
        if IsSuperadmin().has_permission(request, view):
            return True
        
        if request.user.role != 'PARENT':
            return False
        
        # Check if object is related to user's children
        if hasattr(obj, 'student'):
            return obj.student.parent_id == request.user.id
        elif hasattr(obj, 'parent'):
            return obj.parent_id == request.user.id
        
        return False


class IsParentOrCoach(permissions.BasePermission):
    """Check if user is PARENT or COACH with access."""
    
    def has_permission(self, request, view):
        return IsParent().has_permission(request, view) or \
               IsCoach().has_permission(request, view)
    
    def has_object_permission(self, request, view, obj):
        return IsParent().has_object_permission(request, view, obj) or \
               IsCoach().has_object_permission(request, view, obj)
```

### ViewSet Permission Usage

#### Platform ViewSet Example

```python
# platform/tenants/views.py
from rest_framework import viewsets
from shared.permissions.platform import IsPlatformAdmin
from platform.tenants.models import Academy
from platform.tenants.serializers import AcademySerializer

class AcademyViewSet(viewsets.ModelViewSet):
    queryset = Academy.objects.all()
    serializer_class = AcademySerializer
    permission_classes = [IsPlatformAdmin]  # Only superadmin
    
    def get_queryset(self):
        # Superadmin can see all academies
        return Academy.objects.all()
```

#### Tenant ViewSet Example

```python
# tenant/students/views.py
from rest_framework import viewsets
from shared.permissions.tenant import IsTenantAdmin, IsParent
from tenant.students.models import Student
from tenant.students.serializers import StudentSerializer

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsTenantAdmin | IsParent]
    
    def get_queryset(self):
        if self.request.user.is_superadmin:
            return Student.objects.all()
        
        if self.request.user.role == 'PARENT':
            # Parents can only see their own children
            return Student.objects.filter(
                parent_id=self.request.user.id
            )
        
        # Admin/Owner can see all students in their academy
        return Student.objects.filter(academy=self.request.academy)
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'destroy']:
            # Only admins can create/update/delete
            return [IsTenantAdmin()]
        return super().get_permissions()
```

#### Coach ViewSet Example

```python
# tenant/classes/views.py
from rest_framework import viewsets
from shared.permissions.tenant import IsTenantAdmin, IsCoach
from tenant.classes.models import Class
from tenant.classes.serializers import ClassSerializer

class ClassViewSet(viewsets.ModelViewSet):
    queryset = Class.objects.all()
    serializer_class = ClassSerializer
    permission_classes = [IsTenantAdmin | IsCoach]
    
    def get_queryset(self):
        if self.request.user.is_superadmin:
            return Class.objects.all()
        
        if self.request.user.role == 'COACH':
            # Coaches can only see their assigned classes
            return Class.objects.filter(
                academy=self.request.academy,
                coach_id=self.request.user.id
            )
        
        # Admin/Owner can see all classes
        return Class.objects.filter(academy=self.request.academy)
    
    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            # Only admins can create/delete classes
            return [IsTenantAdmin()]
        elif self.action in ['update', 'partial_update']:
            # Admins and assigned coaches can update
            return [IsTenantAdmin() | IsCoach()]
        return super().get_permissions()
```

## Onboarding Check

### Onboarding Middleware

```python
# shared/middleware/onboarding.py
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

class OnboardingCheckMiddleware(MiddlewareMixin):
    """Block tenant APIs if onboarding is incomplete."""
    
    ONBOARDING_EXEMPT_PATHS = [
        '/api/v1/platform/',
        '/api/v1/tenant/onboarding/',
        '/api/v1/auth/',
    ]
    
    def process_request(self, request):
        # Skip for platform endpoints and onboarding endpoints
        if any(request.path.startswith(path) for path in self.ONBOARDING_EXEMPT_PATHS):
            return None
        
        # Skip for unauthenticated requests (handled by auth middleware)
        if not request.user.is_authenticated:
            return None
        
        # Check if tenant onboarding is complete
        if hasattr(request, 'academy') and request.academy:
            if not request.academy.onboarding_completed:
                return JsonResponse(
                    {
                        'detail': 'Onboarding not completed',
                        'required_steps': self._get_required_steps(request.academy)
                    },
                    status=403
                )
        
        return None
    
    def _get_required_steps(self, academy):
        """Get list of incomplete onboarding steps."""
        required = []
        
        if not academy.profile_completed:
            required.append('profile')
        if not academy.locations.exists():
            required.append('location')
        if not academy.sports.exists():
            required.append('sport')
        if not academy.age_categories.exists():
            required.append('age_category')
        if not academy.terms.exists():
            required.append('term')
        if not academy.pricing_items.exists():
            required.append('pricing')
        
        return required
```

## Quota Enforcement

### Quota Check Decorator

```python
# shared/decorators/quota.py
from functools import wraps
from django.http import JsonResponse
from platform.quotas.services import QuotaService

def check_quota(quota_type):
    """Decorator to check quota before allowing operation."""
    
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            if not hasattr(request, 'academy') or not request.academy:
                return JsonResponse(
                    {'detail': 'Academy not found'},
                    status=404
                )
            
            quota_service = QuotaService(request.academy)
            
            if not quota_service.check_quota(quota_type):
                usage = quota_service.get_usage(quota_type)
                limit = quota_service.get_limit(quota_type)
                
                return JsonResponse(
                    {
                        'detail': 'Quota exceeded',
                        'quota_type': quota_type,
                        'current_usage': usage,
                        'limit': limit
                    },
                    status=403
                )
            
            return func(self, request, *args, **kwargs)
        
        return wrapper
    return decorator
```

### Quota Check in ViewSet

```python
# tenant/students/views.py
from shared.decorators.quota import check_quota

class StudentViewSet(viewsets.ModelViewSet):
    # ... other code ...
    
    @check_quota('students')
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
```

## Permission Testing

### Test Examples

```python
# tenant/students/tests/test_permissions.py
from django.test import TestCase
from rest_framework.test import APIClient
from platform.tenants.models import Academy
from platform.accounts.models import User

class StudentPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.academy = Academy.objects.create(name="Test Academy")
        self.admin = User.objects.create_user(
            email="admin@test.com",
            role="ADMIN",
            academy=self.academy
        )
        self.coach = User.objects.create_user(
            email="coach@test.com",
            role="COACH",
            academy=self.academy
        )
    
    def test_admin_can_create_student(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/tenant/students/', {
            'name': 'John Doe',
            'academy': self.academy.id
        })
        self.assertEqual(response.status_code, 201)
    
    def test_coach_cannot_create_student(self):
        self.client.force_authenticate(user=self.coach)
        response = self.client.post('/api/v1/tenant/students/', {
            'name': 'John Doe',
            'academy': self.academy.id
        })
        self.assertEqual(response.status_code, 403)
```

## Best Practices

1. **Always Check Permissions**: Never rely on UI restrictions alone
2. **Use Permission Classes**: Use Django REST Framework permission classes
3. **Test Permissions**: Write tests for all permission scenarios
4. **Document Permissions**: Document who can access what
5. **Principle of Least Privilege**: Grant minimum required permissions
6. **Audit Logging**: Log all permission checks and denials
7. **Consistent Enforcement**: Apply permissions consistently across all endpoints
8. **Error Messages**: Provide clear error messages for permission denials
9. **Role Hierarchy**: Respect role hierarchy in permission checks
10. **Tenant Isolation**: Always filter by academy_id for tenant resources

## Security Considerations

1. **JWT Token Validation**: Always validate JWT tokens
2. **Role Verification**: Verify user role from token, not from database on every request
3. **Academy Verification**: Verify academy_id from token matches request.academy
4. **Object-Level Permissions**: Check permissions on individual objects, not just collections
5. **SQL Injection Prevention**: Use Django ORM to prevent SQL injection
6. **Rate Limiting**: Implement rate limiting to prevent abuse
7. **Audit Trail**: Log all permission checks for security auditing
8. **Token Expiration**: Enforce token expiration
9. **Refresh Tokens**: Use refresh tokens for long-lived sessions
10. **HTTPS Only**: Enforce HTTPS in production
