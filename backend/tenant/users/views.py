"""
Views for user management and invite operations.
"""
from rest_framework import viewsets, status
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model, authenticate
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from tenant.users.models import User, InviteToken
from tenant.users.serializers import (
    UserSerializer,
    UserListSerializer,
    StaffCoachNotInvitedSerializer,
    CreateAdminUserSerializer,
    CreateCoachUserSerializer,
    CreateParentUserSerializer,
    UpdateUserSerializer,
    AcceptInviteSerializer,
    LoginSerializer,
    CurrentAccountSerializer,
    ChangePasswordSerializer,
)
from tenant.users.services import UserService
from tenant.users.permissions import CanCreateUsers
from shared.permissions.tenant import IsTenantAdmin
from shared.permissions.base import IsSuperadmin
from shared.utils.queryset_filtering import filter_by_academy
from shared.services.quota import QuotaExceededError
from rest_framework import permissions
from tenant.coaches.models import Coach

User = get_user_model()


class CurrentAccountView(RetrieveUpdateAPIView):
    """Retrieve or update the authenticated tenant admin account."""

    serializer_class = CurrentAccountSerializer
    permission_classes = [IsTenantAdmin]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """Change the authenticated tenant admin password."""

    permission_classes = [IsTenantAdmin]

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

    @action(detail=False, methods=['post'], permission_classes=[CanCreateUsers], url_path='invite')
    def invite(self, request):
        """
        Generic invite endpoint that routes to role-specific endpoints.
        
        POST /api/v1/tenant/users/invite/
        Expects: { role: 'ADMIN'|'COACH'|'PARENT', email: str, ... }
        """
        role = request.data.get('role')
        
        if role == User.Role.ADMIN:
            return self.admins(request)
        elif role == User.Role.COACH:
            return self.coaches(request)
        elif role == User.Role.PARENT:
            return self.parents(request)
        else:
            return Response(
                {'detail': f'Invalid role: {role}. Must be ADMIN, COACH, or PARENT.'},
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


class LoginView(APIView):
    """
    Public endpoint for user login with email and password.
    
    POST /api/v1/auth/token/
    """
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Authenticate user and return JWT tokens."""
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        # Check if user exists and is active before authenticating
        # Django's authenticate() returns None for inactive users
        try:
            user = User.objects.get(email=email)
            if not user.is_active:
                return Response(
                    {'detail': 'User account is disabled.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        except User.DoesNotExist:
            # User doesn't exist, authenticate will fail anyway
            pass
        
        # Authenticate user
        user = authenticate(request, username=email, password=password)
        
        if user is None:
            return Response(
                {'detail': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        # Update last_login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        return Response(
            {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'role': user.role,
                    'academy_id': str(user.academy_id) if hasattr(user, 'academy_id') and user.academy_id else None,
                }
            },
            status=status.HTTP_200_OK
        )


class ValidateInviteView(APIView):
    """
    Public endpoint for validating invite tokens.

    GET /api/v1/auth/invite/validate/?token=...
    """

    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get('token')

        if not token:
            return Response(
                {'detail': 'Token is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        active_tokens = InviteToken.objects.filter(
            used_at__isnull=True,
            expires_at__gt=timezone.now()
        ).select_related('user', 'academy')

        invite_token = None
        for candidate in active_tokens:
            if InviteToken.verify_token(candidate.token_hash, token):
                invite_token = candidate
                break

        if not invite_token:
            return Response(
                {'detail': 'Invalid or expired invite token.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                'status': 'success',
                'data': {
                    'email': invite_token.user.email,
                    'role': invite_token.user.role,
                    'academy_name': invite_token.academy.name,
                    'expires_at': invite_token.expires_at
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
        
        try:
            user = UserService.accept_invite(
                token=serializer.validated_data['token'],
                password=serializer.validated_data['password']
            )
            
            # Generate JWT tokens
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
                    }
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
