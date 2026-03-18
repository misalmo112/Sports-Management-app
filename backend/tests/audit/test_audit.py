from django.test import TestCase
from django.contrib.auth import get_user_model
from saas_platform.audit.models import AuditLog, AuditAction, ResourceType
from saas_platform.audit.services import AuditService
from saas_platform.tenants.models import Academy

User = get_user_model()


class AuditServiceTest(TestCase):
    """Test AuditService."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com'
        )
        
        # Create superadmin without academy (platform-level)
        self.user = User.objects.create_superuser(
            email='test@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            is_active=True
        )
    
    def test_log_action(self):
        """Test logging an action."""
        audit_log = AuditService.log_action(
            user=self.user,
            action=AuditAction.CREATE,
            resource_type=ResourceType.ACADEMY,
            resource_id=str(self.academy.id),
            academy=self.academy,
            changes_json={'name': 'Test Academy'}
        )
        
        self.assertIsNotNone(audit_log.id)
        self.assertEqual(audit_log.user, self.user)
        self.assertEqual(audit_log.action, AuditAction.CREATE)
        self.assertEqual(audit_log.resource_type, ResourceType.ACADEMY)
        self.assertEqual(audit_log.academy, self.academy)
    
    def test_log_action_with_request(self):
        """Test logging an action with request metadata."""
        from django.test import RequestFactory
        
        factory = RequestFactory()
        request = factory.get('/')
        request.META['HTTP_USER_AGENT'] = 'Test Agent'
        request.META['REMOTE_ADDR'] = '127.0.0.1'
        
        audit_log = AuditService.log_action(
            user=self.user,
            action=AuditAction.UPDATE,
            resource_type=ResourceType.ACADEMY,
            resource_id=str(self.academy.id),
            academy=self.academy,
            changes_json={'name': 'Updated Academy'},
            request=request
        )
        
        self.assertEqual(audit_log.ip_address, '127.0.0.1')
        self.assertEqual(audit_log.user_agent, 'Test Agent')
    
    def test_log_plan_change(self):
        """Test logging plan change action."""
        audit_log = AuditService.log_action(
            user=self.user,
            action=AuditAction.PLAN_CHANGE,
            resource_type=ResourceType.ACADEMY,
            resource_id=str(self.academy.id),
            academy=self.academy,
            changes_json={
                'old_plan_id': 1,
                'new_plan_id': 2
            }
        )
        
        self.assertEqual(audit_log.action, AuditAction.PLAN_CHANGE)
        self.assertIn('old_plan_id', audit_log.changes_json)
    
    def test_log_quota_update(self):
        """Test logging quota update action."""
        audit_log = AuditService.log_action(
            user=self.user,
            action=AuditAction.QUOTA_UPDATE,
            resource_type=ResourceType.QUOTA,
            resource_id=str(self.academy.id),
            academy=self.academy,
            changes_json={
                'before': {'max_students': 100},
                'after': {'max_students': 200}
            }
        )
        
        self.assertEqual(audit_log.action, AuditAction.QUOTA_UPDATE)
        self.assertEqual(audit_log.resource_type, ResourceType.QUOTA)
        self.assertIn('before', audit_log.changes_json)
        self.assertIn('after', audit_log.changes_json)


class AuditLogModelTest(TestCase):
    """Test AuditLog model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com'
        )
        
        # Create superadmin without academy (platform-level)
        self.user = User.objects.create_superuser(
            email='test@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            is_active=True
        )
    
    def test_create_audit_log(self):
        """Test creating an audit log."""
        audit_log = AuditLog.objects.create(
            user=self.user,
            action=AuditAction.CREATE,
            resource_type=ResourceType.ACADEMY,
            resource_id=str(self.academy.id),
            academy=self.academy,
            changes_json={'name': 'Test Academy'}
        )
        
        self.assertIsNotNone(audit_log.id)
        self.assertEqual(audit_log.user, self.user)
        self.assertEqual(audit_log.action, AuditAction.CREATE)
    
    def test_audit_log_str(self):
        """Test audit log string representation."""
        audit_log = AuditLog.objects.create(
            user=self.user,
            action=AuditAction.CREATE,
            resource_type=ResourceType.ACADEMY,
            resource_id=str(self.academy.id),
            academy=self.academy
        )
        
        str_repr = str(audit_log)
        self.assertIn(AuditAction.CREATE, str_repr)
        self.assertIn(ResourceType.ACADEMY, str_repr)
