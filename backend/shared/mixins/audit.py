import logging
from saas_platform.audit.models import AuditAction
from saas_platform.audit.services import TenantAuditService

logger = logging.getLogger(__name__)


class AuditMixin:
    """
    Drop-in mixin for DRF ModelViewSet subclasses.

    Usage:
        class StudentViewSet(AuditMixin, viewsets.ModelViewSet):
            audit_resource_type = ResourceType.STUDENT
            ...

    The mixin captures CREATE, UPDATE, and DELETE actions automatically.
    For custom @action methods, call TenantAuditService.log() directly.
    """

    audit_resource_type = None  # Must be set on the ViewSet

    def _get_audit_academy(self):
        return getattr(self.request, 'academy', None)

    def perform_create(self, serializer):
        instance = serializer.save()
        if self.audit_resource_type:
            try:
                TenantAuditService.log(
                    user=self.request.user,
                    action=AuditAction.CREATE,
                    resource_type=self.audit_resource_type,
                    resource_id=str(instance.pk),
                    academy=self._get_audit_academy(),
                    changes_json={
                        'created': {
                            k: str(v) for k, v in
                            serializer.validated_data.items()
                        }
                    },
                    request=self.request,
                )
            except Exception:
                logger.exception('AuditMixin.perform_create log failed')

    def perform_update(self, serializer):
        before = {
            field: str(getattr(serializer.instance, field, None))
            for field in serializer.validated_data
        }
        instance = serializer.save()
        if self.audit_resource_type:
            try:
                TenantAuditService.log(
                    user=self.request.user,
                    action=AuditAction.UPDATE,
                    resource_type=self.audit_resource_type,
                    resource_id=str(instance.pk),
                    academy=self._get_audit_academy(),
                    changes_json={
                        'before': before,
                        'after': {
                            k: str(v) for k, v in
                            serializer.validated_data.items()
                        },
                    },
                    request=self.request,
                )
            except Exception:
                logger.exception('AuditMixin.perform_update log failed')

    def perform_destroy(self, instance):
        resource_id = str(instance.pk)
        instance.delete()
        if self.audit_resource_type:
            try:
                TenantAuditService.log(
                    user=self.request.user,
                    action=AuditAction.DELETE,
                    resource_type=self.audit_resource_type,
                    resource_id=resource_id,
                    academy=self._get_audit_academy(),
                    request=self.request,
                )
            except Exception:
                logger.exception('AuditMixin.perform_destroy log failed')
