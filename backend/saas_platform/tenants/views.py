import logging
from datetime import timedelta
from django.db.models import deletion
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import APIException
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from django.conf import settings
from django.utils import timezone
from saas_platform.tenants.models import Academy
from saas_platform.tenants.export_service import build_academy_export_zip
from saas_platform.tenants.serializers import (
    AcademySerializer,
    AcademyCreateSerializer,
    AcademyListSerializer,
    PlanUpdateSerializer,
    QuotaUpdateSerializer
)
from saas_platform.quotas.serializers import StorageSnapshotSerializer
from saas_platform.quotas.models import StorageSnapshot
from saas_platform.tenants.services import AcademyService
from saas_platform.audit.services import AuditService
from saas_platform.audit.models import AuditAction, ResourceType
from shared.permissions.platform import IsPlatformAdmin
from shared.tenancy.schema import schema_context
from tenant.users.models import User
from tenant.users.services import UserService

logger = logging.getLogger(__name__)


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
        
        # Extract owner_email and plan_id from validated data (not stored on Academy)
        owner_email = serializer.validated_data.pop('owner_email', None)
        plan_id = serializer.validated_data.pop('plan_id', None)
        
        # Create academy with remaining validated data
        academy = AcademyService.create_academy(serializer.validated_data)
        try:
            AcademyService.provision_tenant_schema(academy)
        except Exception as exc:
            logger.exception(
                "Failed to provision tenant schema for academy",
                extra={'academy_id': str(academy.id)},
            )
            Academy.objects.filter(pk=academy.pk).delete()
            raise APIException("Failed to provision academy. Please retry.") from exc
        
        # Assign subscription so quota is set (required before creating owner)
        from saas_platform.subscriptions.models import Plan
        if not plan_id:
            first_plan = Plan.objects.filter(is_active=True).order_by('id').first()
            if first_plan:
                plan_id = first_plan.id
        if plan_id:
            try:
                AcademyService.update_academy_plan(academy, plan_id=plan_id)
            except Exception as exc:
                logger.warning(
                    "Could not assign plan to new academy; owner creation may fail if quota is 0",
                    extra={'academy_id': str(academy.id), 'plan_id': plan_id},
                )
        
        # Create owner user (as ADMIN with full permissions) and send invite if owner_email is provided
        if owner_email:
            try:
                with schema_context(academy.schema_name) as schema_active:
                    # Create ADMIN user as the academy owner (ADMIN role has full tenant access)
                    user, token = UserService.create_user_with_invite(
                        role=User.Role.ADMIN,
                        email=owner_email,
                        academy=academy,
                        created_by=None if schema_active else request.user,
                        profile_data={}
                    )
                    UserService.send_invite_email_async(user, token)
            except Exception as e:
                # Log error but don't fail academy creation
                logger.error(f"Failed to create owner user for academy {academy.id}: {str(e)}")
        
        # Audit log
        audit_data = serializer.validated_data.copy()
        if owner_email:
            audit_data['owner_email'] = owner_email
        if plan_id is not None:
            audit_data['plan_id'] = plan_id
        AuditService.log_action(
            user=request.user,
            action=AuditAction.CREATE,
            resource_type=ResourceType.ACADEMY,
            resource_id=str(academy.id),
            academy=academy,
            changes_json={'created': audit_data},
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

    def destroy(self, request, *args, **kwargs):
        """Delete an academy. Audit log is recorded before deletion."""
        instance = self.get_object()
        resource_id = str(instance.id)
        academy_name = instance.name
        AuditService.log_action(
            user=request.user,
            action=AuditAction.DELETE,
            resource_type=ResourceType.ACADEMY,
            resource_id=resource_id,
            academy=instance,
            changes_json={'deleted': {'name': academy_name}},
            request=request
        )
        try:
            return super().destroy(request, *args, **kwargs)
        except deletion.ProtectedError:
            return Response(
                {
                    'detail': (
                        'Cannot delete academy: it is referenced by protected records '
                        '(e.g. platform payments). Export data first, then try again.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
    
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

    @action(detail=True, methods=['post'], url_path='invite-link')
    def invite_link(self, request, pk=None):
        """Generate a fresh invite link for the academy's primary admin."""
        academy = self.get_object()
        force = bool(request.data.get('force', False))

        with schema_context(academy.schema_name) as schema_active:
            user = User.objects.filter(
                academy=academy,
                role=User.Role.ADMIN
            ).order_by('created_at').first()

            token = None

            if not user:
                email = request.data.get('email') or academy.email
                if not email:
                    return Response(
                        {'detail': 'No admin user found. Provide an email to create one.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                existing_user = User.objects.filter(
                    academy=academy,
                    email=email
                ).first()

                if existing_user and existing_user.role != User.Role.ADMIN:
                    return Response(
                        {'detail': 'User exists but is not an admin.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if existing_user:
                    user = existing_user
                else:
                    user, token = UserService.create_user_with_invite(
                        role=User.Role.ADMIN,
                        email=email,
                        academy=academy,
                        created_by=None if schema_active else request.user,
                        profile_data={}
                    )

            if user.is_active and user.is_verified:
                if not force:
                    return Response(
                        {'detail': 'Admin user is already active.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                user.is_active = False
                user.is_verified = False
                user.save(update_fields=['is_active', 'is_verified', 'updated_at'])

            if token is None:
                token = UserService.resend_invite(
                    user,
                    created_by=None if schema_active else request.user
                )
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        invite_url = f"{frontend_url}/accept-invite?token={token}"
        expiration_hours = getattr(settings, 'INVITE_TOKEN_EXPIRATION_HOURS', 48)

        return Response(
            {
                'invite_url': invite_url,
                'email': user.email,
                'role': user.role,
                'expires_in_hours': expiration_hours
            },
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['get'], url_path='export')
    def export(self, request, pk=None):
        """Export all academy data (platform + tenant) as a ZIP for download before delete."""
        academy = self.get_object()
        zip_buffer = build_academy_export_zip(academy)
        safe_slug = (academy.slug or str(academy.id))[:50].replace(' ', '-')
        date_str = timezone.now().strftime('%Y-%m-%d')
        filename = f'academy-{safe_slug}-export-{date_str}.zip'
        response = HttpResponse(zip_buffer.getvalue(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['patch'], url_path='quota')
    def update_quota(self, request, pk=None):
        """Update quota overrides for academy."""
        academy = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_subscription = academy.subscriptions.filter(is_current=True).first()
        old_overrides = old_subscription.overrides_json.copy() if old_subscription else {}

        try:
            subscription = AcademyService.update_academy_quota(
                academy=academy,
                overrides_json=serializer.validated_data['overrides_json']
            )
        except ValueError as exc:
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_400_BAD_REQUEST
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

    @action(
        detail=True,
        methods=["get"],
        url_path="storage-history",
        permission_classes=[IsPlatformAdmin],
    )
    def storage_history(self, request, pk=None):
        """Return StorageSnapshot history for the academy (platform admin only)."""
        academy = self.get_object()

        days_param = request.query_params.get("days", 30)
        try:
            days = int(days_param)
        except (TypeError, ValueError):
            return Response(
                {"detail": "Invalid 'days' query parameter."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        days = max(1, min(days, 365))
        since = timezone.now() - timedelta(days=days)

        snapshots_qs = (
            StorageSnapshot.objects.filter(
                academy=academy,
                recorded_at__gte=since,
            )
            .order_by("-recorded_at")
        )

        snapshots_count = snapshots_qs.count()
        return Response(
            {
                "academy_id": str(academy.id),
                "days": days,
                "count": snapshots_count,
                "snapshots": StorageSnapshotSerializer(snapshots_qs, many=True).data,
            },
            status=status.HTTP_200_OK,
        )
