from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory
from rest_framework import status
from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from tenant.coaches.models import Coach
from tenant.coaches.views import CoachViewSet
from django.utils import timezone

User = get_user_model()


class CoachViewSetTest(TestCase):
    """Test CoachViewSet API endpoints."""
    
    def setUp(self):
        self.factory = APIRequestFactory()
        
        self.academy1 = Academy.objects.create(
            name="Academy 1",
            slug="academy-1",
            email="academy1@test.com",
            onboarding_completed=True
        )
        
        self.plan = Plan.objects.create(
            name="Basic Plan",
            slug="basic-plan",
            limits_json={
                'max_students': 10,
                'max_coaches': 5,
                'max_classes': 20
            }
        )
        self.subscription = Subscription.objects.create(
            academy=self.academy1,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )
        
        self.admin = User.objects.create_user(
            email='admin@academy1.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.academy1
        )
    
    def _create_request(self, method='get', path='/', data=None):
        """Helper to create request with academy context."""
        from rest_framework.test import force_authenticate
        
        if method == 'get':
            request = self.factory.get(path)
        elif method == 'post':
            request = self.factory.post(path, data, format='json')
        else:
            request = self.factory.get(path)
        
        request.user = self.admin
        request.academy = self.academy1
        # Force authenticate the user
        force_authenticate(request, user=request.user)
        return request
    
    def test_create_coach_with_quota_check(self):
        """Test creating coach with quota enforcement."""
        # Create coaches up to quota limit
        for i in range(5):
            Coach.objects.create(
                academy=self.academy1,
                first_name=f"Coach{i}",
                last_name="Test",
                email=f"coach{i}@test.com"
            )
        
        # Try to create 6th coach (should fail)
        request = self._create_request('post', '/api/v1/tenant/coaches/', {
            'first_name': 'Coach6',
            'last_name': 'Test',
            'email': 'coach6@test.com'
        })
        viewset = CoachViewSet.as_view({'post': 'create'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('quota', response.data['detail'].lower())
    
    def test_tenant_isolation(self):
        """Test tenant isolation."""
        academy2 = Academy.objects.create(
            name="Academy 2",
            slug="academy-2",
            email="academy2@test.com",
            onboarding_completed=True
        )
        
        Coach.objects.create(
            academy=academy2,
            first_name="Coach",
            last_name="Other",
            email="coach@academy2.com"
        )
        
        request = self._create_request('get', '/api/v1/tenant/coaches/')
        viewset = CoachViewSet.as_view({'get': 'list'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)
