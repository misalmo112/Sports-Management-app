from rest_framework import permissions
from shared.permissions.base import IsSuperadmin


def _is_tenant_dashboard_role(user) -> bool:
    role = getattr(user, 'role', None)
    return role in ('OWNER', 'ADMIN', 'STAFF')


def has_full_tenant_dashboard_module_access(user) -> bool:
    """
    True for OWNER, or ADMIN with allowed_modules NULL (v1 full-academy-admin bypass).
    STAFF and other roles: False.
    """
    role = getattr(user, 'role', None)
    if role == 'OWNER':
        return True
    if role == 'ADMIN':
        return getattr(user, 'allowed_modules', None) is None
    return False


def user_has_tenant_module(user, module_key: str) -> bool:
    """True if user may use the tenant dashboard for this module key (STAFF: key in allowed_modules)."""
    if not module_key:
        return False
    return tenant_dashboard_actor_has_module(user, module_key)


def tenant_dashboard_actor_has_module(user, module_key: str | None) -> bool:
    """
    OWNER always allowed. ADMIN with allowed_modules NULL = full. STAFF needs module_key in list.
    If module_key is None: OWNER/ADMIN pass; STAFF denied (views must set required_tenant_module).
    """
    role = getattr(user, 'role', None)
    if role == 'OWNER':
        return True
    if role == 'ADMIN':
        if module_key is None:
            return True
        mods = getattr(user, 'allowed_modules', None)
        return mods is None
    if role == 'STAFF':
        if not module_key:
            return False
        mods = getattr(user, 'allowed_modules', None) or []
        return module_key in mods
    return False


def check_tenant_admin_module(request, view, module_key: str) -> bool:
    """Use when module depends on request (e.g. report_type query param)."""
    return _tenant_admin_core(request, view, module_key)


def _tenant_admin_core(request, view, module_key: str | None) -> bool:
    if not request.user or not request.user.is_authenticated:
        return False
    if IsSuperadmin().has_permission(request, view):
        return True
    if not getattr(request, 'academy', None):
        return False
    user = request.user
    if not hasattr(user, 'role'):
        return bool(getattr(user, 'is_staff', False))
    if not _is_tenant_dashboard_role(user):
        return False
    if getattr(user, 'academy_id', None) != request.academy.id:
        return False
    effective_key = module_key if module_key is not None else getattr(view, 'required_tenant_module', None)
    return tenant_dashboard_actor_has_module(user, effective_key)


class IsAuthenticatedAcademyUser(permissions.BasePermission):
    """Authenticated user belonging to request.academy (e.g. My Account for any tenant role)."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if IsSuperadmin().has_permission(request, view):
            return True
        academy = getattr(request, 'academy', None)
        if not academy:
            return False
        return getattr(request.user, 'academy_id', None) == academy.id


class IsTenantAdmin(permissions.BasePermission):
    """
    OWNER, legacy ADMIN (NULL allowed_modules), or STAFF with required_tenant_module on the view.
    """

    def has_permission(self, request, view):
        return _tenant_admin_core(request, view, None)

    def has_object_permission(self, request, view, obj):
        if IsSuperadmin().has_permission(request, view):
            return True
        if not hasattr(request, 'academy') or not request.academy:
            return False
        # Academy settings views return the Academy row itself (no academy_id FK)
        try:
            from saas_platform.tenants.models import Academy as AcademyModel
        except ImportError:
            AcademyModel = tuple()
        if isinstance(obj, AcademyModel):
            if obj.id != request.academy.id:
                return False
        elif hasattr(obj, 'academy_id'):
            if obj.academy_id != request.academy.id:
                return False
        else:
            return False
        user = request.user
        if not hasattr(user, 'role'):
            return bool(getattr(user, 'is_staff', False))
        if not _is_tenant_dashboard_role(user):
            return False
        effective_key = getattr(view, 'required_tenant_module', None)
        return tenant_dashboard_actor_has_module(user, effective_key)


def tenant_admin_module_permission(module_key: str):
    """For function-based views: permission class with fixed module key."""

    class _TenantAdminModulePermission(permissions.BasePermission):
        def has_permission(self, request, view):
            return _tenant_admin_core(request, view, module_key)

        def has_object_permission(self, request, view, obj):
            if IsSuperadmin().has_permission(request, view):
                return True
            if not hasattr(request, 'academy') or not request.academy:
                return False
            try:
                from saas_platform.tenants.models import Academy as AcademyModel
            except ImportError:
                AcademyModel = tuple()
            if isinstance(obj, AcademyModel):
                if obj.id != request.academy.id:
                    return False
            elif hasattr(obj, 'academy_id'):
                if obj.academy_id != request.academy.id:
                    return False
            else:
                return False
            user = request.user
            if not hasattr(user, 'role'):
                return bool(getattr(user, 'is_staff', False))
            if not _is_tenant_dashboard_role(user):
                return False
            return tenant_dashboard_actor_has_module(user, module_key)

    _TenantAdminModulePermission.__name__ = f'TenantAdminModule_{module_key.replace("-", "_")}'
    return _TenantAdminModulePermission


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
