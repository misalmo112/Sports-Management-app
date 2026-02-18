"""
Views for Tenant Feedback API.
"""
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from tenant.communication.models import Feedback, FeedbackStatus, FeedbackPriority
from tenant.communication.serializers import (
    FeedbackSerializer,
    FeedbackCreateSerializer,
    FeedbackUpdateSerializer
)
from tenant.communication.services import FeedbackService
from shared.permissions.tenant import IsTenantAdmin, IsParent, IsTenantAdminOrParent
from shared.utils.queryset_filtering import filter_by_academy


class FeedbackFilter(filters.FilterSet):
    """Filter set for Feedback list view."""
    
    status = filters.ChoiceFilter(choices=FeedbackStatus.choices)
    priority = filters.ChoiceFilter(choices=FeedbackPriority.choices)
    parent = filters.NumberFilter(field_name='parent_id')
    assigned_to = filters.NumberFilter(field_name='assigned_to_id')
    
    class Meta:
        model = Feedback
        fields = ['status', 'priority', 'parent', 'assigned_to']


class FeedbackViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Feedback management.
    
    Provides:
    - POST /api/v1/tenant/feedback/ - Create feedback (PARENT only)
    - GET /api/v1/tenant/feedback/ - List feedback (ADMIN/OWNER only)
    - GET /api/v1/tenant/feedback/{id}/ - Get feedback details (ADMIN/OWNER only)
    - PATCH /api/v1/tenant/feedback/{id}/ - Update feedback (ADMIN/OWNER only)
    """
    queryset = Feedback.objects.all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = FeedbackFilter
    search_fields = ['subject', 'message']
    ordering_fields = ['created_at', 'priority', 'status']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter queryset by academy and parent."""
        queryset = Feedback.objects.all()
        
        # Superadmin can see all
        if hasattr(self.request.user, 'role') and self.request.user.role == 'SUPERADMIN':
            return queryset
        
        # Parents can only see their own feedback
        if hasattr(self.request.user, 'role') and self.request.user.role == 'PARENT':
            queryset = queryset.filter(parent=self.request.user)
            if hasattr(self.request, 'academy') and self.request.academy:
                queryset = queryset.filter(academy=self.request.academy)
            return queryset
        
        # Admin/Owner: filter by academy
        if hasattr(self.request, 'academy') and self.request.academy:
            queryset = filter_by_academy(
                queryset,
                self.request.academy,
                self.request.user,
                self.request
            )
        return queryset
    
    def get_permissions(self):
        """Return appropriate permissions based on action."""
        if self.action == 'create':
            return [IsParent()]
        elif self.action in ['list', 'retrieve']:
            # Parents can list and view their own feedback, admins can see all
            return [IsTenantAdminOrParent()]
        else:
            # Only admins can update feedback
            return [IsTenantAdmin()]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return FeedbackCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return FeedbackUpdateSerializer
        return FeedbackSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new feedback (PARENT only)."""
        if not hasattr(request, 'academy') or not request.academy:
            return Response(
                {'error': 'Academy context required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        feedback = FeedbackService.create_feedback(
            academy=request.academy,
            parent=request.user,
            validated_data=serializer.validated_data
        )
        
        response_serializer = FeedbackSerializer(feedback)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update a feedback (ADMIN/OWNER only)."""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        feedback = FeedbackService.update_feedback(
            feedback=instance,
            validated_data=serializer.validated_data
        )
        
        response_serializer = FeedbackSerializer(feedback)
        return Response(response_serializer.data)
