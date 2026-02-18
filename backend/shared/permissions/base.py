from rest_framework import permissions


class IsSuperadmin(permissions.BasePermission):
    """Check if user is superadmin."""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user has role attribute and it's SUPERADMIN
        if hasattr(request.user, 'role'):
            if request.user.role == 'SUPERADMIN':
                return True
            # If role exists but is not SUPERADMIN, check is_superuser as fallback
            # This allows tenant users with is_superuser=True to access platform APIs
            if hasattr(request.user, 'is_superuser') and request.user.is_superuser:
                return True
            return False
        
        # Fallback: check if user is Django superuser (for testing compatibility)
        # In production, User model should have a 'role' field
        if hasattr(request.user, 'is_superuser'):
            return request.user.is_superuser
        
        return False
    
    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
