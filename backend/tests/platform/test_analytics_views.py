"""
Tests for Platform Analytics API endpoints (Stats and Errors).
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from saas_platform.quotas.models import TenantUsage
from saas_platform.audit.models import AuditLog, AuditAction, ResourceType
from django.utils import timezone

User = get_user_model()


class StatsViewTest(TestCase):
    """Test Platform Stats API endpoint."""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create test data
        self.academy = Academy.objects.create(
            name='Test Academy Stats',
            slug='test-academy-stats',
            email='test-stats@example.com',
            is_active=True,
            onboarding_completed=True
        )
        
        # Create superadmin user (platform-level, no academy required)
        self.superadmin = User.objects.create_superuser(
            email='superadmin-stats@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            is_active=True
        )
        
        # Create non-superadmin user
        self.admin = User.objects.create_user(
            email='admin-stats@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.academy,
            is_active=True,
            is_superuser=False,
            is_staff=False
        )
        
        self.plan = Plan.objects.create(
            name='Basic Plan',
            slug='basic-plan',
            limits_json={'max_students': 100}
        )
        
        Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )
        
        TenantUsage.objects.create(
            academy=self.academy,
            students_count=50,
            coaches_count=5,
            classes_count=10,
            storage_used_bytes=5368709120
        )
    
    def test_get_stats_superadmin(self):
        """Test getting platform stats as superadmin."""
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get('/api/v1/platform/stats/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('academies', response.data)
        self.assertIn('subscriptions', response.data)
        self.assertIn('usage', response.data)
        self.assertGreaterEqual(response.data['academies']['total'], 1)
    
    def test_get_stats_non_superadmin(self):
        """Test that non-superadmin cannot get stats."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/platform/stats/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ErrorsViewTest(TestCase):
    """Test Platform Errors API endpoint."""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create test academy
        self.academy = Academy.objects.create(
            name='Test Academy Errors',
            slug='test-academy-errors',
            email='test-errors@example.com'
        )
        
        # Create superadmin user (platform-level, no academy required)
        self.superadmin = User.objects.create_superuser(
            email='superadmin-errors@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            is_active=True
        )
        
        # Create test audit logs
        AuditLog.objects.create(
            user=self.superadmin,
            action=AuditAction.CREATE,
            resource_type=ResourceType.ACADEMY,
            resource_id=str(self.academy.id),
            academy=self.academy
        )
    
    def test_get_errors_superadmin(self):
        """Test getting platform errors as superadmin."""
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get('/api/v1/platform/errors/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
        self.assertGreaterEqual(response.data['count'], 1)
        self.assertGreaterEqual(len(response.data['results']), 1)
    
    def test_get_errors_with_date_filter(self):
        """Test getting errors with date filter."""
        self.client.force_authenticate(user=self.superadmin)
        
        date_from = (timezone.now() - timezone.timedelta(days=7)).isoformat()
        response = self.client.get(f'/api/v1/platform/errors/?date_from={date_from}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
