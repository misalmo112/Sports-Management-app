from rest_framework import permissions
from shared.permissions.base import IsSuperadmin


class IsPlatformAdmin(permissions.BasePermission):
    """Check if user can access platform resources (superadmin only)."""

    def has_permission(self, request, view):
        return IsSuperadmin().has_permission(request, view)

    def has_object_permission(self, request, view, obj):
        return IsSuperadmin().has_object_permission(request, view, obj)


class IsPlatformAdminOrReadOnly(permissions.BasePermission):
    """Allow read (GET, HEAD, OPTIONS) for any authenticated user; write only for platform admin.
    Use for global master data (e.g. countries) that should be visible everywhere."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return IsSuperadmin().has_permission(request, view)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return IsSuperadmin().has_object_permission(request, view, obj)
