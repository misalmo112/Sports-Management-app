"""
Tests for Platform Audit Logs API endpoints.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from saas_platform.tenants.models import Academy
from saas_platform.audit.models import AuditLog, AuditAction, ResourceType
from django.utils import timezone

User = get_user_model()


class AuditLogViewSetTest(TestCase):
    """Test AuditLogViewSet API endpoints."""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create test academy
        self.academy = Academy.objects.create(
            name='Test Academy Audit',
            slug='test-academy-audit',
            email='test-audit@example.com'
        )
        
        # Create superadmin user (platform-level, no academy required)
        self.superadmin = User.objects.create_superuser(
            email='superadmin-audit@example.com',
            password='testpass123',
            is_active=True
        )
        
        # Create separate academy for non-superadmin user
        test_academy = Academy.objects.create(
            name='Test Academy Super Audit',
            slug='test-academy-super-audit',
            email='test-super-audit@example.com'
        )
        
        # Create non-superadmin user
        self.admin = User.objects.create_user(
            email='admin-audit@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=test_academy,
            is_active=True,
            is_superuser=False,
            is_staff=False
        )
        
        # Create test audit logs
        self.audit_log1 = AuditLog.objects.create(
            user=self.superadmin,
            action=AuditAction.CREATE,
            resource_type=ResourceType.ACADEMY,
            resource_id=str(self.academy.id),
            academy=self.academy
        )
        
        self.audit_log2 = AuditLog.objects.create(
            user=self.superadmin,
            action=AuditAction.UPDATE,
            resource_type=ResourceType.ACADEMY,
            resource_id=str(self.academy.id),
            academy=self.academy
        )
    
    def test_list_audit_logs_superadmin(self):
        """Test listing audit logs as superadmin."""
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get('/api/v1/platform/audit-logs/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response might be paginated or a list
        if 'results' in response.data:
            self.assertGreaterEqual(len(response.data['results']), 2)
        else:
            self.assertGreaterEqual(len(response.data), 2)
    
    def test_list_audit_logs_non_superadmin(self):
        """Test that non-superadmin cannot list audit logs."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/platform/audit-logs/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_retrieve_audit_log_superadmin(self):
        """Test retrieving audit log details as superadmin."""
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get(f'/api/v1/platform/audit-logs/{self.audit_log1.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['action'], AuditAction.CREATE)
    
    def test_filter_audit_logs_by_action(self):
        """Test filtering audit logs by action."""
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get('/api/v1/platform/audit-logs/?action=CREATE')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # All returned logs should have CREATE action
        results = response.data.get('results', response.data)
        for log in results:
            self.assertEqual(log['action'], AuditAction.CREATE)
    
    def test_filter_audit_logs_by_academy(self):
        """Test filtering audit logs by academy."""
        self.client.force_authenticate(user=self.superadmin)
        # Use academy_id for filtering (UUID needs to be converted to string)
        academy_id = str(self.academy.id) if hasattr(self.academy.id, '__str__') else self.academy.id
        response = self.client.get(f'/api/v1/platform/audit-logs/?academy={academy_id}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # All returned logs should belong to the academy
        results = response.data.get('results', response.data)
        for log in results:
            # Academy is returned as UUID
            academy_value = log.get('academy')
            self.assertEqual(str(academy_value), str(self.academy.id))
    
    def test_search_audit_logs(self):
        """Test searching audit logs."""
        self.client.force_authenticate(user=self.superadmin)
        # Search by resource_id (academy ID as string)
        response = self.client.get(f'/api/v1/platform/audit-logs/?search={str(self.academy.id)}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertGreaterEqual(len(results), 1)
