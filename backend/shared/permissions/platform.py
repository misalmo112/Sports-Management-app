from rest_framework import permissions
from shared.permissions.base import IsSuperadmin


class IsPlatformAdmin(permissions.BasePermission):
    """Check if user can access platform resources (superadmin only)."""
    
    def has_permission(self, request, view):
        return IsSuperadmin().has_permission(request, view)
    
    def has_object_permission(self, request, view, obj):
        return IsSuperadmin().has_object_permission(request, view, obj)
