"""
Tests for Platform Plans API endpoints.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from saas_platform.subscriptions.models import Plan
from django.contrib.auth import get_user_model

# For platform tests, we use tenant.users.User model
# Superusers can be created without academy (platform-level admins)
User = get_user_model()


class PlanViewSetTest(TestCase):
    """Test PlanViewSet API endpoints."""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create superadmin user (platform-level, no academy required)
        self.superadmin = User.objects.create_superuser(
            email='superadmin-plans@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            is_active=True
        )
        
        # Create test academy for non-superadmin user
        from saas_platform.tenants.models import Academy
        test_academy = Academy.objects.create(
            name='Test Academy Plans',
            slug='test-academy-plans',
            email='test-plans@example.com'
        )
        
        # Create non-superadmin user
        self.admin = User.objects.create_user(
            email='admin-plans@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=test_academy,
            is_active=True,
            is_superuser=False,
            is_staff=False
        )
        
        # Create test plan
        self.plan = Plan.objects.create(
            name='Basic Plan',
            slug='basic-plan',
            description='Basic subscription plan',
            price_monthly=99.00,
            limits_json={'max_students': 100, 'storage_bytes': 10737418240},
            is_active=True,
            is_public=True
        )
    
    def test_list_plans_superadmin(self):
        """Test listing plans as superadmin."""
        # Refresh user to ensure is_superuser is set
        self.superadmin.refresh_from_db()
        self.assertTrue(self.superadmin.is_superuser)
        
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get('/api/v1/platform/plans/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response might be paginated or a list
        if 'results' in response.data:
            self.assertGreaterEqual(len(response.data['results']), 1)
        else:
            self.assertGreaterEqual(len(response.data), 1)
    
    def test_list_plans_non_superadmin(self):
        """Test that non-superadmin cannot list plans."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/platform/plans/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_create_plan_superadmin(self):
        """Test creating plan as superadmin."""
        self.client.force_authenticate(user=self.superadmin)
        
        data = {
            'name': 'Premium Plan',
            'slug': 'premium-plan',
            'description': 'Premium subscription plan',
            'price_monthly': 199.00,
            'limits_json': {'max_students': 500, 'storage_bytes': 53687091200},
            'is_active': True,
            'is_public': True
        }
        
        response = self.client.post('/api/v1/platform/plans/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Premium Plan')
        self.assertIn('id', response.data)
    
    def test_create_plan_non_superadmin(self):
        """Test that non-superadmin cannot create plan."""
        self.client.force_authenticate(user=self.admin)
        
        data = {
            'name': 'Premium Plan',
            'slug': 'premium-plan',
            'price_monthly': 199.00
        }
        
        response = self.client.post('/api/v1/platform/plans/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_retrieve_plan_superadmin(self):
        """Test retrieving plan details as superadmin."""
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get(f'/api/v1/platform/plans/{self.plan.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Basic Plan')
    
    def test_update_plan_superadmin(self):
        """Test updating plan as superadmin."""
        self.client.force_authenticate(user=self.superadmin)
        
        data = {
            'name': 'Updated Plan',
            'price_monthly': 149.00
        }
        
        response = self.client.patch(f'/api/v1/platform/plans/{self.plan.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Plan')
        self.assertEqual(float(response.data['price_monthly']), 149.00)
    
    def test_filter_plans_by_active(self):
        """Test filtering plans by is_active."""
        Plan.objects.create(
            name='Inactive Plan',
            slug='inactive-plan',
            is_active=False
        )
        
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get('/api/v1/platform/plans/?is_active=true')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # All returned plans should be active
        for plan in response.data['results']:
            self.assertTrue(plan['is_active'])
    
    def test_search_plans(self):
        """Test searching plans by name."""
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get('/api/v1/platform/plans/?search=Basic')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)
