from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from django.utils import timezone

User = get_user_model()


class AcademyViewSetTest(TestCase):
    """Test AcademyViewSet API endpoints."""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create test academy (required for User model)
        test_academy = Academy.objects.create(
            name='Test Academy for Users',
            slug='test-academy-users',
            email='test-users@example.com'
        )
        
        # Create superadmin user (platform-level, no academy required)
        self.superadmin = User.objects.create_superuser(
            email='superadmin@example.com',
            password='testpass123',
            is_active=True
        )
        
        # Create non-superadmin user
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=test_academy,
            is_active=True,
            is_superuser=False,
            is_staff=False
        )
        
        self.plan = Plan.objects.create(
            name='Basic Plan',
            slug='basic-plan',
            limits_json={
                'storage_bytes': 10737418240,
                'max_students': 100
            }
        )
    
    def test_create_academy_superadmin(self):
        """Test creating academy as superadmin."""
        self.client.force_authenticate(user=self.superadmin)
        
        data = {
            'name': 'Test Academy',
            'slug': 'test-academy',
            'email': 'test@example.com',
            'timezone': 'UTC'
        }
        
        response = self.client.post('/api/v1/platform/academies/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Test Academy')
        self.assertIn('id', response.data)
    
    def test_create_academy_non_superadmin(self):
        """Test that non-superadmin cannot create academy."""
        self.client.force_authenticate(user=self.admin)
        
        data = {
            'name': 'Test Academy',
            'slug': 'test-academy',
            'email': 'test@example.com'
        }
        
        response = self.client.post('/api/v1/platform/academies/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_list_academies_superadmin(self):
        """Test listing academies as superadmin."""
        Academy.objects.create(
            name='Academy 1',
            slug='academy-1',
            email='academy1@example.com'
        )
        Academy.objects.create(
            name='Academy 2',
            slug='academy-2',
            email='academy2@example.com'
        )
        
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get('/api/v1/platform/academies/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should have at least 2 academies (plus any created in setUp)
        self.assertGreaterEqual(response.data['count'], 2)
        self.assertGreaterEqual(len(response.data['results']), 2)
    
    def test_list_academies_non_superadmin(self):
        """Test that non-superadmin cannot list academies."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/platform/academies/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_update_academy_plan(self):
        """Test updating academy plan."""
        academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com'
        )
        
        self.client.force_authenticate(user=self.superadmin)
        
        data = {
            'plan_id': self.plan.id,
            'start_at': timezone.now().isoformat()
        }
        
        response = self.client.patch(
            f'/api/v1/platform/academies/{academy.id}/plan/',
            data
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response should contain subscription data
        self.assertIn('plan', response.data or {})
    
    def test_update_academy_quota(self):
        """Test updating academy quota."""
        academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com'
        )
        
        # Create subscription first
        Subscription.objects.create(
            academy=academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )
        
        self.client.force_authenticate(user=self.superadmin)
        
        data = {
            'overrides_json': {
                'max_students': 200
            }
        }
        
        response = self.client.patch(
            f'/api/v1/platform/academies/{academy.id}/quota/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['max_students'], 200)
