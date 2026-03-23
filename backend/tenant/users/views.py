"""
Views for user management and invite operations.
"""
import logging
from rest_framework import viewsets, status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model
from django.db import connection
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from tenant.users.models import User, InviteToken
from shared.tenancy.schema import public_schema_context, schema_context
from tenant.users.auth_helpers import (
    _find_invite_token_across_schemas,
    _find_reset_token_across_schemas,
    _find_user_by_email_across_schemas,
)
from saas_platform.tenants.models import Academy
from tenant.users.serializers import (
    UserSerializer,
    UserListSerializer,
    StaffCoachNotInvitedSerializer,
    GuardianParentNotInvitedSerializer,
    CreateAdminUserSerializer,
    CreateStaffUserSerializer,
    CreateCoachUserSerializer,
    CreateParentUserSerializer,
    UpdateUserSerializer,
    AcceptInviteSerializer,
    LoginSerializer,
    CurrentAccountSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
)
from tenant.users.services import (
    UserService,
    actor_bypasses_last_admin_guard,
    count_elevated_tenant_admins,
)
from tenant.users.permissions import CanCreateUsers
from shared.permissions.tenant import IsTenantAdmin, IsAuthenticatedAcademyUser
from shared.permissions.base import IsSuperadmin
from shared.utils.queryset_filtering import filter_by_academy
from shared.services.quota import QuotaExceededError
from rest_framework import permissions
from tenant.coaches.models import Coach
from tenant.students.models import Parent

User = get_user_model()


class CurrentAccountView(RetrieveUpdateAPIView):
    """Retrieve or update the authenticated tenant admin account."""

    serializer_class = CurrentAccountSerializer
    permission_classes = [IsAuthenticatedAcademyUser]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """Change the authenticated tenant admin password."""

    permission_classes = [IsAuthenticatedAcademyUser]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password', 'updated_at'])

        return Response(
            {'detail': 'Password updated successfully.'},
            status=status.HTTP_200_OK,
        )


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user management.
    
    Provides:
    - List users (filtered by academy and role)
    - Retrieve user details
    - Update user (activate/deactivate, update profile)
    """

    required_tenant_module = 'users'
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'is_active', 'is_verified']
    search_fields = ['email']
    ordering_fields = ['email', 'role', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter by academy, with special handling for superadmin."""
        queryset = super().get_queryset()
        
        # Superadmin can see all users
        if hasattr(self.request.user, 'role') and self.request.user.role == 'SUPERADMIN':
            queryset = queryset
        elif hasattr(self.request.user, 'is_superuser') and self.request.user.is_superuser:
            queryset = queryset
        else:
            # Otherwise, filter by academy
            queryset = filter_by_academy(
                queryset,
                self.request.academy,
                self.request.user,
                self.request
            )
        
        # Prefetch invite tokens to avoid N+1 queries when listing users
        if self.action == 'list':
            queryset = queryset.prefetch_related('invite_tokens')
        
        return queryset
    
    
    def get_serializer_class(self):
        """Use appropriate serializer based on action."""
        if self.action == 'list':
            return UserListSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateUserSerializer
        return UserSerializer
    
    def get_permissions(self):
        """Restrict destroy to admins and superadmins."""
        if self.action == 'destroy':
            # Create a combined permission class
            class IsTenantAdminOrSuperadmin(permissions.BasePermission):
                def has_permission(self, request, view):
                    return IsTenantAdmin().has_permission(request, view) or \
                           IsSuperadmin().has_permission(request, view)
                
                def has_object_permission(self, request, view, obj):
                    return IsTenantAdmin().has_object_permission(request, view, obj) or \
                           IsSuperadmin().has_object_permission(request, view, obj)
            
            return [IsTenantAdminOrSuperadmin()]
        return super().get_permissions()
    
    def perform_destroy(self, instance):
        """Soft delete by setting is_active=False."""
        actor = self.request.user
        if (
            instance.academy_id
            and instance.role in (User.Role.OWNER, User.Role.ADMIN)
            and instance.is_active
            and instance.is_verified
            and not actor_bypasses_last_admin_guard(actor)
        ):
            if count_elevated_tenant_admins(instance.academy_id, exclude_user_id=instance.pk) == 0:
                raise DRFValidationError(
                    {
                        'detail': (
                            'Cannot remove the last active Owner or Admin for this academy.'
                        )
                    }
                )
        instance.is_active = False
        instance.save()
    
    def create(self, request, *args, **kwargs):
        """
        Create user endpoint.
        
        This is handled by specific endpoints (create_admin, create_coach, create_parent).
        """
        return Response(
            {'detail': 'Use specific endpoints: /admins, /coaches, or /parents'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
    
    @action(detail=False, methods=['get'], url_path='coaches-for-management')
    def coaches_for_management(self, request):
        """
        Return a unified list of coaches for the User Management Coaches tab:
        (1) Users with role COACH, (2) Staff coaches with no linked user (not yet invited).
        GET /api/v1/tenant/users/coaches-for-management/
        """
        academy = getattr(request, 'academy', None)
        if not academy:
            return Response(
                {'detail': 'Academy context required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        # Coach users (invited or accepted)
        users_qs = (
            User.objects.filter(academy=academy, role=User.Role.COACH)
            .prefetch_related('invite_tokens')
        )
        user_rows = []
        for u in users_qs:
            data = UserListSerializer(u).data
            data['source'] = 'user'
            data['user_id'] = u.id
            user_rows.append(data)
        # Staff coaches not yet invited
        staff_coaches_qs = Coach.objects.filter(academy=academy, user__isnull=True)
        staff_serializer = StaffCoachNotInvitedSerializer(staff_coaches_qs, many=True)
        staff_rows = []
        for item in staff_serializer.data:
            row = dict(item)
            row['source'] = 'staff_not_invited'
            row['invite_status'] = 'none'
            staff_rows.append(row)
        result = user_rows + staff_rows
        return Response(result)

    @action(detail=False, methods=['get'], url_path='parents-for-management')
    def parents_for_management(self, request):
        """
        Unified list for User Management Parents tab:
        (1) Active Parent (guardian) rows with or without a matching PARENT User,
        (2) PARENT Users whose email is not on any Parent record for the academy.
        GET /api/v1/tenant/users/parents-for-management/
        """
        academy = getattr(request, 'academy', None)
        if not academy:
            return Response(
                {'detail': 'Academy context required.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        parents_qs = Parent.objects.filter(
            academy=academy, is_active=True
        ).order_by('last_name', 'first_name')

        parent_users_qs = (
            User.objects.filter(academy=academy, role=User.Role.PARENT)
            .prefetch_related('invite_tokens')
        )
        email_to_user = {}
        for u in parent_users_qs:
            key = (u.email or '').lower().strip()
            if key:
                email_to_user[key] = u

        parent_emails = set()
        rows = []
        for p in parents_qs:
            email_norm = (p.email or '').lower().strip()
            parent_emails.add(email_norm)
            user = email_to_user.get(email_norm)
            if user:
                data = UserListSerializer(user).data
                data['source'] = 'user'
                data['user_id'] = user.id
                data['guardian_parent_id'] = p.id
                rows.append(data)
            else:
                row = dict(GuardianParentNotInvitedSerializer(p).data)
                row['source'] = 'guardian_not_invited'
                row['invite_status'] = 'none'
                row['role'] = User.Role.PARENT
                rows.append(row)

        for u in parent_users_qs:
            key = (u.email or '').lower().strip()
            if key and key not in parent_emails:
                data = UserListSerializer(u).data
                data['source'] = 'user'
                data['user_id'] = u.id
                rows.append(data)

        return Response(rows)

    @action(detail=False, methods=['post'], permission_classes=[CanCreateUsers], url_path='invite')
    def invite(self, request):
        """
        Generic invite endpoint that routes to role-specific endpoints.
        
        POST /api/v1/tenant/users/invite/
        Expects: { role: 'ADMIN'|'STAFF'|'COACH'|'PARENT', email: str, ... }
        """
        role = request.data.get('role')
        
        if role == User.Role.ADMIN:
            return self.admins(request)
        elif role == User.Role.STAFF:
            return self.staff_users(request)
        elif role == User.Role.COACH:
            return self.coaches(request)
        elif role == User.Role.PARENT:
            return self.parents(request)
        else:
            return Response(
                {'detail': f'Invalid role: {role}. Must be ADMIN, STAFF, COACH, or PARENT.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], permission_classes=[CanCreateUsers])
    def admins(self, request):
        """
        Create an ADMIN user.
        
        POST /api/v1/admin/users/admins/
        """
        serializer = CreateAdminUserSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        try:
            user, token = UserService.create_user_with_invite(
                role=User.Role.ADMIN,
                email=serializer.validated_data['email'],
                academy=request.academy,
                created_by=request.user,
                profile_data=serializer.validated_data.get('profile', {})
            )
            
            # Send invite email asynchronously
            UserService.send_invite_email_async(user, token)
            
            # Return user data
            user_serializer = UserSerializer(user)
            return Response(
                {
                    **user_serializer.data,
                    'invite_sent': True
                },
                status=status.HTTP_201_CREATED
            )
        except QuotaExceededError as e:
            return Response(
                {
                    'detail': str(e),
                    'quota_type': e.quota_type,
                    'current_usage': e.current_usage,
                    'limit': e.limit,
                },
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], permission_classes=[CanCreateUsers], url_path='staff')
    def staff_users(self, request):
        """
        Create a STAFF user with allowed_modules.

        POST /api/v1/admin/users/staff/
        """
        serializer = CreateStaffUserSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        try:
            fn = (serializer.validated_data.get('first_name') or '').strip()
            ln = (serializer.validated_data.get('last_name') or '').strip()
            user, token = UserService.create_user_with_invite(
                role=User.Role.STAFF,
                email=serializer.validated_data['email'],
                academy=request.academy,
                created_by=request.user,
                allowed_modules=serializer.validated_data['allowed_modules'],
                first_name=fn or None,
                last_name=ln or None,
            )

            UserService.send_invite_email_async(user, token)

            user_serializer = UserSerializer(user)
            return Response(
                {
                    **user_serializer.data,
                    'invite_sent': True
                },
                status=status.HTTP_201_CREATED
            )
        except QuotaExceededError as e:
            return Response(
                {
                    'detail': str(e),
                    'quota_type': e.quota_type,
                    'current_usage': e.current_usage,
                    'limit': e.limit,
                },
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], permission_classes=[CanCreateUsers])
    def coaches(self, request):
        """
        Create a COACH user.
        
        POST /api/v1/admin/users/coaches/
        """
        serializer = CreateCoachUserSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        try:
            profile_data = serializer.validated_data.get('profile', {})
            # location_id is already in profile_data from serializer
            
            user, token = UserService.create_user_with_invite(
                role=User.Role.COACH,
                email=serializer.validated_data['email'],
                academy=request.academy,
                created_by=request.user,
                profile_data=profile_data
            )
            
            # Send invite email asynchronously
            UserService.send_invite_email_async(user, token)
            
            # Return user data
            user_serializer = UserSerializer(user)
            return Response(
                {
                    **user_serializer.data,
                    'invite_sent': True
                },
                status=status.HTTP_201_CREATED
            )
        except QuotaExceededError as e:
            return Response(
                {
                    'detail': str(e),
                    'quota_type': e.quota_type,
                    'current_usage': e.current_usage,
                    'limit': e.limit,
                },
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], permission_classes=[CanCreateUsers])
    def parents(self, request):
        """
        Create a PARENT user.
        
        POST /api/v1/admin/users/parents/
        """
        serializer = CreateParentUserSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        try:
            user, token = UserService.create_user_with_invite(
                role=User.Role.PARENT,
                email=serializer.validated_data['email'],
                academy=request.academy,
                created_by=request.user,
                profile_data=serializer.validated_data.get('profile', {})
            )
            
            # Send invite email asynchronously
            UserService.send_invite_email_async(user, token)
            
            # Return user data
            user_serializer = UserSerializer(user)
            return Response(
                {
                    **user_serializer.data,
                    'invite_sent': True
                },
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], permission_classes=[CanCreateUsers])
    def resend_invite(self, request, pk=None):
        """
        Resend invite for a user.
        
        POST /api/v1/admin/users/{id}/resend_invite/
        """
        user = self.get_object()
        
        # Verify user belongs to academy
        if user.academy_id != request.academy.id:
            return Response(
                {'detail': 'User does not belong to this academy.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            token = UserService.resend_invite(user, created_by=request.user)
            UserService.send_invite_email_async(user, token)
            
            return Response(
                {'detail': 'Invite resent successfully.', 'invite_sent': True},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


logger = logging.getLogger(__name__)


class LoginView(APIView):
    """
    Public endpoint for user login with email and password.
    
    POST /api/v1/auth/token/
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Authenticate user and return JWT tokens.
        Auth routes are exempt from tenant schema routing, so we resolve the user
        by email across all tenant schemas (same as forgot-password/reset flow).
        """
        try:
            serializer = LoginSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            email = serializer.validated_data['email']
            password = serializer.validated_data['password']

            # Resolve user across tenant schemas (auth runs without schema set)
            user, schema_name = _find_user_by_email_across_schemas(email)
            # Fallback: user in public/current schema (e.g. tests or no tenant schemas)
            if not user:
                user = User.objects.filter(email=email).first()
                schema_name = None
            if not user:
                return Response(
                    {'detail': 'Invalid email or password.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            if not user.is_active:
                return Response(
                    {'detail': 'User account is disabled.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            if not user.check_password(password):
                return Response(
                    {'detail': 'Invalid email or password.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            # Update last_login in the tenant schema
            if schema_name and connection.vendor == 'postgresql':
                with schema_context(schema_name):
                    user.last_login = timezone.now()
                    user.save(update_fields=['last_login'])
            else:
                user.last_login = timezone.now()
                user.save(update_fields=['last_login'])

            # Resolve academy_id for response so frontend can send X-Academy-ID on tenant API calls
            academy_id = None
            if schema_name and connection.vendor == 'postgresql':
                with schema_context(schema_name):
                    if hasattr(user, 'academy_id') and user.academy_id:
                        academy_id = str(user.academy_id)
                if not academy_id:
                    academy = Academy.objects.filter(schema_name=schema_name).first()
                    if academy:
                        academy_id = str(academy.id)
            if academy_id is None and hasattr(user, 'academy_id') and user.academy_id:
                academy_id = str(user.academy_id)

            refresh = RefreshToken.for_user(user)
            return Response(
                {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'role': user.role,
                        'academy_id': academy_id,
                        'allowed_modules': getattr(user, 'allowed_modules', None),
                    }
                },
                status=status.HTTP_200_OK
            )
        except Exception as exc:
            logger.exception(
                "Login failed for request to /api/v1/auth/token/: %s",
                exc,
                exc_info=True,
            )
            raise


class ValidateInviteView(APIView):
    """
    Public endpoint for validating invite tokens.

    GET /api/v1/auth/invite/validate/?token=...
    """

    permission_classes = [AllowAny]

    def get(self, request):
        token = (request.query_params.get('token') or '').strip()

        if not token:
            return Response(
                {'detail': 'Token is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        invite_token, _schema = _find_invite_token_across_schemas(token)

        if not invite_token:
            return Response(
                {'detail': 'Invalid or expired invite token.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        u = invite_token.user
        return Response(
            {
                'status': 'success',
                'data': {
                    'email': u.email,
                    'role': u.role,
                    'academy_name': invite_token.academy.name,
                    'expires_at': invite_token.expires_at,
                    'first_name': u.first_name or '',
                    'last_name': u.last_name or '',
                }
            },
            status=status.HTTP_200_OK
        )


class AcceptInviteView(APIView):
    """
    Public endpoint for accepting invite and setting password.
    
    POST /api/v1/auth/invite/accept/
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Accept invite and set password."""
        serializer = AcceptInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        plain_token = serializer.validated_data['token']
        password = serializer.validated_data['password']

        try:
            invite_token, schema_name = _find_invite_token_across_schemas(plain_token)

            if not invite_token:
                return Response(
                    {'detail': 'Invalid or expired invite token.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if schema_name and connection.vendor == 'postgresql':
                with schema_context(schema_name) as active:
                    if not active:
                        return Response(
                            {'detail': 'Tenant schema unavailable.'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    invite_token.mark_as_used()
                    user = invite_token.user
                    user.set_password(password)
                    user.is_active = True
                    user.is_verified = True
                    user.save(update_fields=['password', 'is_active', 'is_verified', 'updated_at'])
            else:
                if connection.vendor == 'postgresql':
                    with public_schema_context():
                        invite_token.mark_as_used()
                        user = invite_token.user
                        user.set_password(password)
                        user.is_active = True
                        user.is_verified = True
                        user.save(
                            update_fields=['password', 'is_active', 'is_verified', 'updated_at']
                        )
                else:
                    invite_token.mark_as_used()
                    user = invite_token.user
                    user.set_password(password)
                    user.is_active = True
                    user.is_verified = True
                    user.save(
                        update_fields=['password', 'is_active', 'is_verified', 'updated_at']
                    )

            refresh = RefreshToken.for_user(user)
            
            return Response(
                {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'role': user.role,
                        'academy_id': str(user.academy_id),
                        'allowed_modules': getattr(user, 'allowed_modules', None),
                    }
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ForgotPasswordView(APIView):
    """
    Public endpoint for requesting a password reset email.
    POST /api/v1/auth/forgot-password/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        UserService.request_password_reset(serializer.validated_data['email'])
        return Response(
            {'detail': 'If an account with that email exists, a reset link has been sent.'},
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    """
    Public endpoint for resetting password with token.
    POST /api/v1/auth/reset-password/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from django.core.exceptions import ValidationError as DjangoValidationError
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            UserService.reset_password(
                token=serializer.validated_data['token'],
                new_password=serializer.validated_data['password'],
            )
            return Response(
                {'detail': 'Password has been reset successfully.'},
                status=status.HTTP_200_OK,
            )
        except DjangoValidationError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
