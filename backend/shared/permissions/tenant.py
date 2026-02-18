from rest_framework import permissions
from shared.permissions.base import IsSuperadmin


class IsTenantAdmin(permissions.BasePermission):
    """Check if user is OWNER or ADMIN of the academy."""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superadmin can access tenant resources (read-only enforcement at viewset level)
        if IsSuperadmin().has_permission(request, view):
            return True
        
        if not hasattr(request, 'academy') or not request.academy:
            return False
        
        # Check if user has role attribute
        if hasattr(request.user, 'role'):
            return request.user.role in ['OWNER', 'ADMIN']
        
        # Fallback: check if user is Django staff (for testing compatibility)
        if hasattr(request.user, 'is_staff'):
            return request.user.is_staff
        
        return False
    
    def has_object_permission(self, request, view, obj):
        if IsSuperadmin().has_permission(request, view):
            return True
        
        if not hasattr(obj, 'academy'):
            return False
        
        # Check if object belongs to user's academy
        if not hasattr(request, 'academy') or not request.academy:
            return False
        
        if obj.academy_id != request.academy.id:
            return False
        
        # Check role
        if hasattr(request.user, 'role'):
            return request.user.role in ['OWNER', 'ADMIN']
        
        if hasattr(request.user, 'is_staff'):
            return request.user.is_staff
        
        return False


class IsOwner(permissions.BasePermission):
    """Check if user is OWNER of the academy."""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if IsSuperadmin().has_permission(request, view):
            return True
        
        if not hasattr(request, 'academy') or not request.academy:
            return False
        
        if hasattr(request.user, 'role'):
            return request.user.role == 'OWNER'
        
        return False
    
    def has_object_permission(self, request, view, obj):
        if IsSuperadmin().has_permission(request, view):
            return True
        
        if not hasattr(obj, 'academy'):
            return False
        
        if not hasattr(request, 'academy') or not request.academy:
            return False
        
        if obj.academy_id != request.academy.id:
            return False
        
        if hasattr(request.user, 'role'):
            return request.user.role == 'OWNER'
        
        return False


class IsCoach(permissions.BasePermission):
    """Check if user is COACH assigned to the resource."""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if IsSuperadmin().has_permission(request, view):
            return True
        
        if hasattr(request.user, 'role'):
            if request.user.role == 'COACH':
                return True
        
        # Fallback: check if user is linked to a coach profile
        try:
            from tenant.coaches.models import Coach
            if hasattr(request, 'academy') and request.academy:
                Coach.objects.get(user=request.user, academy=request.academy, is_active=True)
                return True
        except (Coach.DoesNotExist, ImportError):
            pass
        
        return False
    
    def has_object_permission(self, request, view, obj):
        if IsSuperadmin().has_permission(request, view):
            return True
        
        if not hasattr(request.user, 'role') or request.user.role != 'COACH':
            return False
        
        # Check if coach is assigned to the class
        if hasattr(obj, 'class_obj'):
            # For enrollment objects
            if hasattr(obj.class_obj, 'coach'):
                return obj.class_obj.coach and obj.class_obj.coach.user_id == request.user.id
        elif hasattr(obj, 'coach'):
            # For class objects
            return obj.coach and obj.coach.user_id == request.user.id
        
        return False


class IsParent(permissions.BasePermission):
    """Check if user is PARENT of the student."""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if IsSuperadmin().has_permission(request, view):
            return True
        
        if hasattr(request.user, 'role'):
            return request.user.role == 'PARENT'
        
        return False
    
    def has_object_permission(self, request, view, obj):
        if IsSuperadmin().has_permission(request, view):
            return True
        
        if not hasattr(request.user, 'role') or request.user.role != 'PARENT':
            return False
        
        # Check if object is related to user's children
        if hasattr(obj, 'student'):
            # For enrollment objects
            if hasattr(obj.student, 'parent'):
                # Check if parent has user_id or email match
                if obj.student.parent:
                    if hasattr(obj.student.parent, 'user_id'):
                        return obj.student.parent.user_id == request.user.id
                    # Fallback: check email match
                    if hasattr(request.user, 'email') and hasattr(obj.student.parent, 'email'):
                        return obj.student.parent.email == request.user.email
        elif hasattr(obj, 'parent'):
            # For student objects
            if obj.parent:
                if hasattr(obj.parent, 'user_id'):
                    return obj.parent.user_id == request.user.id
                if hasattr(request.user, 'email') and hasattr(obj.parent, 'email'):
                    return obj.parent.email == request.user.email
        
        return False


class IsParentOrCoach(permissions.BasePermission):
    """Check if user is PARENT or COACH with access."""
    
    def has_permission(self, request, view):
        return IsParent().has_permission(request, view) or \
               IsCoach().has_permission(request, view)
    
    def has_object_permission(self, request, view, obj):
        return IsParent().has_object_permission(request, view, obj) or \
               IsCoach().has_object_permission(request, view, obj)


class IsTenantAdminOrCoach(permissions.BasePermission):
    """Check if user is TENANT ADMIN or COACH with access."""
    
    def has_permission(self, request, view):
        return IsTenantAdmin().has_permission(request, view) or \
               IsCoach().has_permission(request, view)
    
    def has_object_permission(self, request, view, obj):
        return IsTenantAdmin().has_object_permission(request, view, obj) or \
               IsCoach().has_object_permission(request, view, obj)


class IsTenantAdminOrParent(permissions.BasePermission):
    """Check if user is TENANT ADMIN or PARENT with access."""
    
    def has_permission(self, request, view):
        return IsTenantAdmin().has_permission(request, view) or \
               IsParent().has_permission(request, view)
    
    def has_object_permission(self, request, view, obj):
        return IsTenantAdmin().has_object_permission(request, view, obj) or \
               IsParent().has_object_permission(request, view, obj)


class IsTenantAdminOrParentOrCoach(permissions.BasePermission):
    """Check if user is TENANT ADMIN, PARENT, or COACH with access."""
    
    def has_permission(self, request, view):
        return IsTenantAdmin().has_permission(request, view) or \
               IsParent().has_permission(request, view) or \
               IsCoach().has_permission(request, view)
    
    def has_object_permission(self, request, view, obj):
        return IsTenantAdmin().has_object_permission(request, view, obj) or \
               IsParent().has_object_permission(request, view, obj) or \
               IsCoach().has_object_permission(request, view, obj)
