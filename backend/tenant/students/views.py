from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from tenant.students.models import Parent, Student
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


class StudentViewSet(viewsets.ModelViewSet):
    """ViewSet for Student model."""
    
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
        """Hard delete - actually delete the student."""
        instance.delete()
