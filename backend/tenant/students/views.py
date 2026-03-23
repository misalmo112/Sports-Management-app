from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from tenant.students.models import Parent, Student
from tenant.users.services import UserService
from tenant.users.serializers import UserSerializer
from tenant.users.permissions import CanCreateUsers
from shared.services.quota import QuotaExceededError
from tenant.students.serializers import (
    ParentSerializer,
    ParentListSerializer,
    StudentSerializer,
    StudentListSerializer,
)
from shared.permissions.tenant import (
    IsTenantAdmin, IsParent,
    IsTenantAdminOrParent
)
from shared.decorators.quota import check_quota
from shared.utils.queryset_filtering import filter_by_academy


class ParentViewSet(viewsets.ModelViewSet):
    """ViewSet for Parent model."""

    required_tenant_module = 'students'
    
    queryset = Parent.objects.all()
    serializer_class = ParentSerializer
    permission_classes = [IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['first_name', 'last_name', 'email', 'phone']
    ordering_fields = ['first_name', 'last_name', 'email', 'created_at']
    ordering = ['last_name', 'first_name']
    
    def get_queryset(self):
        """Filter by academy."""
        queryset = super().get_queryset()
        return filter_by_academy(
            queryset,
            self.request.academy,
            self.request.user,
            self.request
        )
    
    def get_serializer_class(self):
        """Use list serializer for list action."""
        if self.action == 'list':
            return ParentListSerializer
        return ParentSerializer
    
    def perform_destroy(self, instance):
        """Soft delete by setting is_active=False."""
        instance.is_active = False
        instance.save()

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsTenantAdmin, CanCreateUsers],
        url_path='invite',
    )
    def invite(self, request, pk=None):
        """
        Create a PARENT User for this guardian and send invite email.
        POST /api/v1/tenant/parents/{id}/invite/
        """
        parent = self.get_object()
        academy = getattr(request, 'academy', None)
        if not academy or parent.academy_id != academy.id:
            return Response(
                {'detail': 'Parent not found or does not belong to your academy.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            user, token = UserService.create_user_with_invite_for_guardian_parent(
                parent=parent,
                academy=academy,
                created_by=request.user,
            )
            UserService.send_invite_email_async(user, token)
            return Response(
                {**UserSerializer(user).data, 'invite_sent': True},
                status=status.HTTP_201_CREATED,
            )
        except DjangoValidationError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except QuotaExceededError as e:
            return Response(
                {
                    'detail': str(e),
                    'quota_type': getattr(e, 'quota_type', None),
                    'current_usage': getattr(e, 'current_usage', None),
                    'limit': getattr(e, 'limit', None),
                },
                status=status.HTTP_403_FORBIDDEN,
            )


class StudentViewSet(viewsets.ModelViewSet):
    """ViewSet for Student model."""

    required_tenant_module = 'students'
    
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsTenantAdminOrParent]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'gender', 'parent']
    search_fields = ['first_name', 'last_name', 'email', 'phone']
    ordering_fields = ['first_name', 'last_name', 'date_of_birth', 'created_at']
    ordering = ['last_name', 'first_name']
    
    def get_queryset(self):
        """Filter by academy, with special handling for parents."""
        queryset = super().get_queryset()
        
        # Superadmin can see all students (but still filter by is_active)
        if hasattr(self.request.user, 'role') and self.request.user.role == 'SUPERADMIN':
            return queryset.filter(is_active=True)
        
        # Parents can only see their own children
        if hasattr(self.request.user, 'role') and self.request.user.role == 'PARENT':
            # Filter by parent's children
            if hasattr(self.request.user, 'email'):
                queryset = queryset.filter(
                    parent__email=self.request.user.email,
                    is_active=True
                )
            else:
                queryset = queryset.none()
        else:
            # Admin/Owner: filter by academy first, then by is_active
            queryset = filter_by_academy(
                queryset,
                self.request.academy,
                self.request.user,
                self.request
            )
            queryset = queryset.filter(is_active=True)
        
        return queryset
    
    def get_serializer_class(self):
        """Use list serializer for list action."""
        if self.action == 'list':
            return StudentListSerializer
        return StudentSerializer
    
    @check_quota('students')
    def create(self, request, *args, **kwargs):
        """Create student with quota check."""
        return super().create(request, *args, **kwargs)
    
    def get_permissions(self):
        """Restrict create/update/delete to admins only."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTenantAdmin()]
        return super().get_permissions()
    
    def perform_destroy(self, instance):
        """Soft delete — keep record, hide from active lists."""
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])
