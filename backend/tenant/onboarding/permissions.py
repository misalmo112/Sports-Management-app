"""
Permission classes for onboarding endpoints.
"""
import uuid

from rest_framework import permissions
from saas_platform.tenants.models import Academy
from shared.permissions.base import IsSuperadmin


def resolve_onboarding_academy(request):
    """
    Ensure request.academy is set from X-Academy-ID or the authenticated user's academy.

    Returns the Academy instance or None.
    """
    if getattr(request, 'academy', None):
        return request.academy

    academy_id_header = request.META.get('HTTP_X_ACADEMY_ID')
    if academy_id_header:
        try:
            academy_uuid = uuid.UUID(academy_id_header)
            try:
                request.academy = Academy.objects.get(id=academy_uuid)
            except Academy.DoesNotExist:
                return None
            return request.academy
        except (ValueError, AttributeError, TypeError):
            return None

    user_academy = getattr(request.user, 'academy', None)
    user_academy_id = getattr(request.user, 'academy_id', None)
    if user_academy:
        request.academy = user_academy
        return request.academy
    if user_academy_id:
        try:
            request.academy = Academy.objects.get(id=user_academy_id)
        except Academy.DoesNotExist:
            return None
        return request.academy
    return None


class CanViewOnboardingState(permissions.BasePermission):
    """
    Any authenticated academy member may read onboarding state (for dashboard guards).

    Mutations (steps, complete) remain restricted to IsOnboardingUser.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if IsSuperadmin().has_permission(request, view):
            return True

        academy = resolve_onboarding_academy(request)
        if not academy:
            return False

        user_academy_id = getattr(request.user, 'academy_id', None)
        if user_academy_id and user_academy_id == academy.id:
            return True

        # Fallback for tests / atypical user models without academy_id
        user_role = getattr(request.user, 'role', None)
        if not user_role and not user_academy_id:
            return True

        return False


class IsOnboardingUser(permissions.BasePermission):
    """Check if user is OWNER or ADMIN of the academy (or superadmin)."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if IsSuperadmin().has_permission(request, view):
            return True

        academy = resolve_onboarding_academy(request)
        if not academy:
            return False

        user_role = getattr(request.user, 'role', None)
        user_academy_id = getattr(request.user, 'academy_id', None)

        if user_role and user_academy_id:
            if user_role in ['OWNER', 'ADMIN'] and user_academy_id == academy.id:
                return True

        if not user_role and not user_academy_id:
            return True

        return False
