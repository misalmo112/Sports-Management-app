"""
Tests for onboarding check middleware.
"""
from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from saas_platform.tenants.models import Academy
from shared.middleware.onboarding_check import OnboardingCheckMiddleware

User = get_user_model()


class OnboardingCheckMiddlewareTest(TestCase):
    """Test OnboardingCheckMiddleware."""
    
    def setUp(self):
        self.factory = RequestFactory()
        # Create a simple get_response callable
        def get_response(request):
            return JsonResponse({'ok': True})
        self.middleware = OnboardingCheckMiddleware(get_response)
        
        # Create academy with onboarding incomplete
        self.academy_incomplete = Academy.objects.create(
            name='Incomplete Academy',
            slug='incomplete-academy',
            email='incomplete@example.com',
            timezone='UTC',
            onboarding_completed=False
        )
        
        # Create academy with onboarding complete
        self.academy_complete = Academy.objects.create(
            name='Complete Academy',
            slug='complete-academy',
            email='complete@example.com',
            timezone='UTC',
            onboarding_completed=True
        )
    
    def test_blocks_tenant_api_when_incomplete(self):
        """Test that tenant APIs are blocked when onboarding incomplete."""
        request = self.factory.get('/api/v1/tenant/students/')
        request.academy = self.academy_incomplete
        # Add user attribute to avoid AttributeError
        request.user = None
        
        response = self.middleware.process_request(request)
        
        self.assertIsInstance(response, JsonResponse)
        self.assertEqual(response.status_code, 403)
        self.assertIn('Onboarding not completed', str(response.content))
    
    def test_allows_tenant_api_when_complete(self):
        """Test that tenant APIs are allowed when onboarding complete."""
        request = self.factory.get('/api/v1/tenant/students/')
        request.academy = self.academy_complete
        request.user = None
        
        response = self.middleware.process_request(request)
        
        # Should return None to continue processing
        self.assertIsNone(response)
    
    def test_allows_onboarding_endpoints(self):
        """Test that onboarding endpoints are always allowed."""
        request = self.factory.get('/api/v1/tenant/onboarding/state/')
        request.academy = self.academy_incomplete
        request.user = None
        
        response = self.middleware.process_request(request)
        
        # Should return None to continue processing
        self.assertIsNone(response)
    
    def test_allows_platform_endpoints(self):
        """Test that platform endpoints are always allowed."""
        request = self.factory.get('/api/v1/platform/academies/')
        request.academy = self.academy_incomplete
        request.user = None
        
        response = self.middleware.process_request(request)
        
        # Should return None to continue processing
        self.assertIsNone(response)
    
    def test_allows_auth_endpoints(self):
        """Test that auth endpoints are always allowed."""
        request = self.factory.get('/api/v1/auth/login/')
        request.academy = self.academy_incomplete
        request.user = None
        
        response = self.middleware.process_request(request)
        
        # Should return None to continue processing
        self.assertIsNone(response)
    
    def test_allows_admin_endpoints(self):
        """Test that admin endpoints are always allowed."""
        request = self.factory.get('/admin/')
        request.academy = self.academy_incomplete
        request.user = None
        
        response = self.middleware.process_request(request)
        
        # Should return None to continue processing
        self.assertIsNone(response)
    
    def test_skips_when_no_academy(self):
        """Test that middleware skips when no academy context."""
        request = self.factory.get('/api/v1/tenant/students/')
        request.academy = None
        request.user = None
        
        response = self.middleware.process_request(request)
        
        # Should return None to continue processing
        self.assertIsNone(response)
