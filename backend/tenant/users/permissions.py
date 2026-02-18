"""
Permission classes for user management.
"""
from rest_framework import permissions
from shared.permissions.tenant import IsTenantAdmin, IsOwner


class CanCreateUsers(permissions.BasePermission):
    """
    Permission to create users.
    
    Only ADMIN or OWNER roles can create users.
    """
    
    def has_permission(self, request, view):
        """Check if user can create users."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Use IsTenantAdmin which checks for ADMIN or OWNER
        return IsTenantAdmin().has_permission(request, view)
    
    def has_object_permission(self, request, view, obj):
        """Check object-level permission."""
        # Users can only be managed within their academy
        if not hasattr(request, 'academy') or not request.academy:
            return False
        
        # Object must belong to request.academy
        if hasattr(obj, 'academy'):
            return obj.academy_id == request.academy.id
        
        return False
