"""
Views for Platform Plans API (Superadmin only).
"""
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from saas_platform.subscriptions.models import Plan
from saas_platform.subscriptions.serializers import PlanSerializer
from saas_platform.audit.services import AuditService
from saas_platform.audit.models import AuditAction, ResourceType
from shared.permissions.platform import IsPlatformAdmin


class PlanFilter(filters.FilterSet):
    """Filter set for Plan list view."""
    
    is_active = filters.BooleanFilter()
    is_public = filters.BooleanFilter()
    
    class Meta:
        model = Plan
        fields = ['is_active', 'is_public']


class PlanViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Plan management (Superadmin only).
    
    Provides:
    - GET /api/v1/platform/plans/ - List plans
    - POST /api/v1/platform/plans/ - Create plan
    - GET /api/v1/platform/plans/{id}/ - Get plan details
    - PATCH /api/v1/platform/plans/{id}/ - Update plan
    """
    queryset = Plan.objects.all()
    permission_classes = [IsPlatformAdmin]
    serializer_class = PlanSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = PlanFilter
    search_fields = ['name', 'slug', 'description']
    ordering_fields = ['name', 'created_at', 'updated_at', 'price_monthly']
    ordering = ['-created_at']
    
    def create(self, request, *args, **kwargs):
        """Create a new plan."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        plan = serializer.save()
        
        # Audit log
        AuditService.log_action(
            user=request.user,
            action=AuditAction.CREATE,
            resource_type=ResourceType.PLAN,
            resource_id=str(plan.id),
            academy=None,
            changes_json={'created': serializer.validated_data},
            request=request
        )
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update a plan."""
        instance = self.get_object()
        old_data = PlanSerializer(instance).data
        
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Audit log
        new_data = serializer.data
        changes = {
            'before': {k: v for k, v in old_data.items() if k in request.data},
            'after': {k: v for k, v in new_data.items() if k in request.data}
        }
        
        AuditService.log_action(
            user=request.user,
            action=AuditAction.UPDATE,
            resource_type=ResourceType.PLAN,
            resource_id=str(instance.id),
            academy=None,
            changes_json=changes,
            request=request
        )
        
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Delete a plan. Forbidden if any subscription references it."""
        instance = self.get_object()
        if instance.subscriptions.exists():
            return Response(
                {
                    'detail': 'Cannot delete plan that has subscriptions. Set plan to inactive instead.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        AuditService.log_action(
            user=request.user,
            action=AuditAction.DELETE,
            resource_type=ResourceType.PLAN,
            resource_id=str(instance.id),
            academy=None,
            changes_json={'deleted': {'name': instance.name}},
            request=request
        )
        return super().destroy(request, *args, **kwargs)
