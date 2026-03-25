from rest_framework import permissions

from tenant.students.models import Parent


class IsParentUser(permissions.BasePermission):
    """
    Allows only authenticated parent users with an active Parent row
    in the current academy, matched by case-insensitive email.
    """

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False

        academy = getattr(request, "academy", None)
        if not academy:
            return False

        if getattr(user, "role", None) != "PARENT":
            return False

        if getattr(user, "academy_id", None) != academy.id:
            return False

        parent = (
            Parent.objects.filter(
                academy=academy,
                email__iexact=user.email,
                is_active=True,
            )
            .only("id", "academy_id", "email", "is_active")
            .first()
        )
        if not parent:
            return False

        request.guardian_parent = parent
        return True
