"""
Permission classes for user management.
"""
from rest_framework import permissions
class CanCreateUsers(permissions.BasePermission):
    """
    Permission to create or invite users.

    Only OWNER or full ADMIN may invite; STAFF is never allowed (even if they had a users module).
    """

    def has_permission(self, request, view):
        """Check if user can create users."""
        if not request.user or not request.user.is_authenticated:
            return False

        role = getattr(request.user, 'role', None)
        if role not in ('OWNER', 'ADMIN'):
            return False
        return bool(getattr(request, 'academy', None))
    
    def has_object_permission(self, request, view, obj):
        """Check object-level permission."""
        # Users can only be managed within their academy
        if not hasattr(request, 'academy') or not request.academy:
            return False
        
        # Object must belong to request.academy
        if hasattr(obj, 'academy'):
            return obj.academy_id == request.academy.id
        
        return False
