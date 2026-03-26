"""
Unit tests for TenantAuditService and AuditMixin.
"""
from unittest.mock import patch, MagicMock
from django.test import TestCase, RequestFactory
from saas_platform.audit.models import AuditLog, AuditAction, ResourceType
from saas_platform.audit.services import TenantAuditService, AuditService
from shared.mixins.audit import AuditMixin


class TenantAuditServiceTests(TestCase):

    def setUp(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )

    def test_log_creates_tenant_scoped_entry(self):
        """TenantAuditService.log() creates AuditLog with scope='TENANT'."""
        entry = TenantAuditService.log(
            user=self.user,
            action=AuditAction.CREATE,
            resource_type=ResourceType.STUDENT,
            resource_id='123',
            academy=None,
        )
        self.assertIsNotNone(entry)
        self.assertEqual(entry.scope, 'TENANT')
        self.assertEqual(entry.action, AuditAction.CREATE)
        self.assertEqual(entry.resource_type, ResourceType.STUDENT)

    def test_log_does_not_raise_on_db_failure(self):
        """TenantAuditService.log() swallows exceptions silently."""
        with patch.object(AuditService, 'log_action', side_effect=Exception('DB error')):
            result = TenantAuditService.log(
                user=self.user,
                action=AuditAction.CREATE,
                resource_type=ResourceType.STUDENT,
                resource_id='123',
                academy=None,
            )
        self.assertIsNone(result)

    def test_log_sets_correct_academy(self):
        """TenantAuditService.log() passes academy correctly."""
        entry = TenantAuditService.log(
            user=self.user,
            action=AuditAction.UPDATE,
            resource_type=ResourceType.COACH,
            resource_id='456',
            academy=None,
            changes_json={'before': {'name': 'old'}, 'after': {'name': 'new'}},
        )
        self.assertIsNotNone(entry)
        self.assertIsNone(entry.academy)


class AuditMixinTests(TestCase):

    def setUp(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123'
        )
        self.factory = RequestFactory()

    def _make_mixin_instance(self, resource_type):
        mixin = AuditMixin()
        request = self.factory.post('/fake/')
        request.user = self.user
        request.academy = None
        mixin.request = request
        mixin.audit_resource_type = resource_type
        return mixin

    def test_perform_create_logs_create_action(self):
        """AuditMixin.perform_create calls TenantAuditService.log with CREATE."""
        mixin = self._make_mixin_instance(ResourceType.STUDENT)

        mock_instance = MagicMock()
        mock_instance.pk = 42
        mock_serializer = MagicMock()
        mock_serializer.save.return_value = mock_instance
        mock_serializer.validated_data = {'name': 'Test Student'}

        with patch.object(TenantAuditService, 'log') as mock_log:
            mixin.perform_create(mock_serializer)
            mock_log.assert_called_once()
            call_kwargs = mock_log.call_args[1]
            self.assertEqual(call_kwargs['action'], AuditAction.CREATE)
            self.assertEqual(call_kwargs['resource_type'], ResourceType.STUDENT)

    def test_perform_update_records_before_and_after(self):
        """AuditMixin.perform_update records before/after in changes_json."""
        mixin = self._make_mixin_instance(ResourceType.COACH)

        mock_instance = MagicMock()
        mock_instance.pk = 99
        mock_instance.name = 'Old Name'
        mock_serializer = MagicMock()
        mock_serializer.save.return_value = mock_instance
        mock_serializer.instance = mock_instance
        mock_serializer.validated_data = {'name': 'New Name'}

        with patch.object(TenantAuditService, 'log') as mock_log:
            mixin.perform_update(mock_serializer)
            mock_log.assert_called_once()
            call_kwargs = mock_log.call_args[1]
            self.assertEqual(call_kwargs['action'], AuditAction.UPDATE)
            self.assertIn('before', call_kwargs['changes_json'])
            self.assertIn('after', call_kwargs['changes_json'])

    def test_perform_destroy_logs_delete_after_deletion(self):
        """AuditMixin.perform_destroy calls TenantAuditService.log with DELETE after deletion."""
        mixin = self._make_mixin_instance(ResourceType.STUDENT)

        mock_instance = MagicMock()
        mock_instance.pk = 77
        deleted_ids = []

        def capture_delete():
            deleted_ids.append(mock_instance.pk)

        mock_instance.delete = capture_delete

        with patch.object(TenantAuditService, 'log') as mock_log:
            mixin.perform_destroy(mock_instance)
            self.assertEqual(len(deleted_ids), 1)
            mock_log.assert_called_once()
            call_kwargs = mock_log.call_args[1]
            self.assertEqual(call_kwargs['action'], AuditAction.DELETE)
            self.assertEqual(call_kwargs['resource_id'], '77')
