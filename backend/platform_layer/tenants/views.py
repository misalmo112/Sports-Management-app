from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from saas_platform.tenants.models import Academy
from saas_platform.tenants.serializers import (
    AcademySerializer,
    AcademyCreateSerializer,
    AcademyListSerializer,
    PlanUpdateSerializer,
    QuotaUpdateSerializer
)
from saas_platform.tenants.services import AcademyService
from saas_platform.audit.services import AuditService
from saas_platform.audit.models import AuditAction, ResourceType
from shared.permissions.platform import IsPlatformAdmin


class AcademyFilter(filters.FilterSet):
    """Filter set for Academy list view."""
    
    is_active = filters.BooleanFilter()
    onboarding_completed = filters.BooleanFilter()
    
    class Meta:
        model = Academy
        fields = ['is_active', 'onboarding_completed']


class AcademyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Academy management (Superadmin only).
    
    Note: This is a platform ViewSet and does NOT filter by academy.
    For tenant ViewSets, use filter_by_academy() from shared.utils.queryset_filtering.
    
    Example for tenant ViewSets:
        from shared.utils.queryset_filtering import filter_by_academy
        
        def get_queryset(self):
            queryset = Student.objects.all()
            if hasattr(self.request, 'academy') and self.request.academy:
                queryset = filter_by_academy(
                    queryset,
                    self.request.academy,
                    self.request.user,
                    self.request
                )
            return queryset
    
    Provides:
    - POST /api/v1/platform/academies/ - Create academy
    - GET /api/v1/platform/academies/ - List academies
    - GET /api/v1/platform/academies/{id}/ - Get academy details
    - PATCH /api/v1/platform/academies/{id}/ - Update academy
    - PATCH /api/v1/platform/academies/{id}/plan - Update academy plan
    - PATCH /api/v1/platform/academies/{id}/quota - Update academy quota
    """
    queryset = Academy.objects.all()
    permission_classes = [IsPlatformAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = AcademyFilter
    search_fields = ['name', 'email', 'slug']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return AcademyCreateSerializer
        elif self.action == 'list':
            return AcademyListSerializer
        elif self.action == 'update_plan':
            return PlanUpdateSerializer
        elif self.action == 'update_quota':
            return QuotaUpdateSerializer
        return AcademySerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new academy."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        academy = AcademyService.create_academy(serializer.validated_data)
        
        # Audit log
        AuditService.log_action(
            user=request.user,
            action=AuditAction.CREATE,
            resource_type=ResourceType.ACADEMY,
            resource_id=str(academy.id),
            academy=academy,
            changes_json={'created': serializer.validated_data},
            request=request
        )
        
        response_serializer = AcademySerializer(academy)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update an academy."""
        instance = self.get_object()
        old_data = AcademySerializer(instance).data
        
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
            resource_type=ResourceType.ACADEMY,
            resource_id=str(instance.id),
            academy=instance,
            changes_json=changes,
            request=request
        )
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'], url_path='plan')
    def update_plan(self, request, pk=None):
        """Update academy's subscription plan."""
        academy = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        old_subscription = academy.subscriptions.filter(is_current=True).first()
        old_plan_id = old_subscription.plan_id if old_subscription else None
        
        subscription = AcademyService.update_academy_plan(
            academy=academy,
            plan_id=serializer.validated_data['plan_id'],
            start_at=serializer.validated_data.get('start_at'),
            overrides_json=serializer.validated_data.get('overrides_json', {})
        )
        
        # Audit log
        changes = {
            'old_plan_id': old_plan_id,
            'new_plan_id': subscription.plan_id,
            'start_at': str(subscription.start_at),
            'overrides_json': subscription.overrides_json
        }
        
        AuditService.log_action(
            user=request.user,
            action=AuditAction.PLAN_CHANGE,
            resource_type=ResourceType.ACADEMY,
            resource_id=str(academy.id),
            academy=academy,
            changes_json=changes,
            request=request
        )
        
        from saas_platform.subscriptions.serializers import SubscriptionSerializer
        return Response(
            SubscriptionSerializer(subscription).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['patch'], url_path='quota')
    def update_quota(self, request, pk=None):
        """Update quota overrides for academy."""
        academy = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        old_subscription = academy.subscriptions.filter(is_current=True).first()
        old_overrides = old_subscription.overrides_json.copy() if old_subscription else {}
        
        subscription = AcademyService.update_academy_quota(
            academy=academy,
            overrides_json=serializer.validated_data['overrides_json']
        )
        
        # Get updated quota
        from saas_platform.quotas.models import TenantQuota
        quota = TenantQuota.objects.get(academy=academy)
        
        # Audit log
        changes = {
            'before': old_overrides,
            'after': subscription.overrides_json
        }
        
        AuditService.log_action(
            user=request.user,
            action=AuditAction.QUOTA_UPDATE,
            resource_type=ResourceType.QUOTA,
            resource_id=str(academy.id),
            academy=academy,
            changes_json=changes,
            request=request
        )
        
        from saas_platform.quotas.serializers import TenantQuotaSerializer
        return Response(
            TenantQuotaSerializer(quota).data,
            status=status.HTTP_200_OK
        )
