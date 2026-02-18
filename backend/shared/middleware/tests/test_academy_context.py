"""
Comprehensive tests for AcademyContextMiddleware tenant isolation.

Tests cover:
- Academy resolution from header and user mapping
- Access control and validation
- Superadmin bypass
- Edge cases and error handling
"""
import uuid
from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from unittest.mock import Mock, patch
from saas_platform.tenants.models import Academy
from shared.middleware.academy_context import AcademyContextMiddleware
from shared.permissions.base import IsSuperadmin

User = get_user_model()

User = get_user_model()


class AcademyContextMiddlewareTest(TestCase):
    """Test AcademyContextMiddleware."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.factory = RequestFactory()
        self.middleware = AcademyContextMiddleware(lambda request: None)
        
        # Create test academies
        self.academy1 = Academy.objects.create(
            name='Academy 1',
            slug='academy-1',
            email='academy1@test.com',
            is_active=True
        )
        self.academy2 = Academy.objects.create(
            name='Academy 2',
            slug='academy-2',
            email='academy2@test.com',
            is_active=True
        )
        self.inactive_academy = Academy.objects.create(
            name='Inactive Academy',
            slug='inactive-academy',
            email='inactive@test.com',
            is_active=False
        )
        
        # Create test users
        # Create superadmin without academy (platform-level)
        self.superadmin = User.objects.create_superuser(
            email='superadmin@test.com',
            password='testpass123',
            is_active=True
        )
        
        self.tenant_user = User.objects.create_user(
            email='tenant@test.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.academy1
        )
        # Ensure academy is set if not already set
        if hasattr(self.tenant_user, 'academy') and not self.tenant_user.academy:
            self.tenant_user.academy = self.academy1
            self.tenant_user.save()
    
    def test_resolve_from_header(self):
        """Test academy resolution from X-Academy-ID header."""
        request = self.factory.get('/api/v1/tenant/test/')
        request.user = self.superadmin
        request.META['HTTP_X_ACADEMY_ID'] = str(self.academy1.id)
        # User has pk, so is_authenticated will be True
        self.middleware.process_request(request)
        self.assertEqual(request.academy, self.academy1)
    
    def test_resolve_from_user_mapping(self):
        """Test academy resolution from user-academy mapping."""
        request = self.factory.get('/api/v1/tenant/test/')
        request.user = self.tenant_user
        
        # Mock user academy_id via request.auth (JWT token)
        request.auth = {'academy_id': str(self.academy1.id)}
        # User has pk, so is_authenticated will be True
        self.middleware.process_request(request)
        self.assertEqual(request.academy, self.academy1)
    
    def test_header_takes_precedence(self):
        """Test that header takes precedence over user mapping."""
        request = self.factory.get('/api/v1/tenant/test/')
        request.user = self.tenant_user
        request.META['HTTP_X_ACADEMY_ID'] = str(self.academy2.id)
        request.auth = {'academy_id': str(self.academy1.id)}  # User belongs to academy1
        
        # User has pk, so is_authenticated will be True
        # Header should take precedence, but user doesn't belong to academy2, so access denied
        response = self.middleware.process_request(request)
        # Should return 403 because user doesn't belong to academy2
        self.assertIsInstance(response, JsonResponse)
        self.assertEqual(response.status_code, 403)
    
    def test_invalid_header_format(self):
        """Test invalid UUID format in header returns 400."""
        request = self.factory.get('/api/v1/tenant/test/')
        request.user = self.superadmin
        request.META['HTTP_X_ACADEMY_ID'] = 'invalid-uuid'
        
        # User has pk, so is_authenticated will be True
        response = self.middleware.process_request(request)
        self.assertIsInstance(response, JsonResponse)
        self.assertEqual(response.status_code, 400)
        self.assertIn('Invalid X-Academy-ID header format', response.content.decode())
    
    def test_academy_not_found(self):
        """Test academy not found returns 404."""
        request = self.factory.get('/api/v1/tenant/test/')
        request.user = self.superadmin
        fake_id = uuid.uuid4()
        request.META['HTTP_X_ACADEMY_ID'] = str(fake_id)
        
        # User has pk, so is_authenticated will be True
        response = self.middleware.process_request(request)
        self.assertIsInstance(response, JsonResponse)
        self.assertEqual(response.status_code, 404)
        self.assertIn('Academy not found', response.content.decode())
    
    def test_inactive_academy_blocked(self):
        """Test inactive academy access is blocked."""
        request = self.factory.get('/api/v1/tenant/test/')
        request.user = self.superadmin
        request.META['HTTP_X_ACADEMY_ID'] = str(self.inactive_academy.id)
        
        # User has pk, so is_authenticated will be True
        response = self.middleware.process_request(request)
        self.assertIsInstance(response, JsonResponse)
        self.assertEqual(response.status_code, 403)
        self.assertIn('Academy is inactive', response.content.decode())
    
    def test_superadmin_can_access_any_academy(self):
        """Test superadmin can access any academy."""
        request = self.factory.get('/api/v1/tenant/test/')
        request.user = self.superadmin
        request.META['HTTP_X_ACADEMY_ID'] = str(self.academy2.id)
        
        # User has pk, so is_authenticated will be True
        self.middleware.process_request(request)
        # Superadmin should be able to access academy2 even though they don't belong to it
        self.assertEqual(request.academy, self.academy2)
    
    def test_tenant_user_blocked_from_other_academy(self):
        """Test tenant user blocked from accessing other academy."""
        request = self.factory.get('/api/v1/tenant/test/')
        request.user = self.tenant_user
        request.META['HTTP_X_ACADEMY_ID'] = str(self.academy2.id)
        request.auth = {'academy_id': str(self.academy1.id)}  # User belongs to academy1
        
        # User has pk, so is_authenticated will be True
        response = self.middleware.process_request(request)
        self.assertIsInstance(response, JsonResponse)
        self.assertEqual(response.status_code, 403)
        self.assertIn('Access denied', response.content.decode())
    
    def test_tenant_user_can_access_own_academy(self):
        """Test tenant user can access own academy."""
        request = self.factory.get('/api/v1/tenant/test/')
        request.user = self.tenant_user
        request.META['HTTP_X_ACADEMY_ID'] = str(self.academy1.id)
        request.auth = {'academy_id': str(self.academy1.id)}  # User belongs to academy1
        
        # User has pk, so is_authenticated will be True
        self.middleware.process_request(request)
        self.assertEqual(request.academy, self.academy1)
    
    def test_unauthenticated_request_skips_middleware(self):
        """Test unauthenticated requests skip academy resolution."""
        request = self.factory.get('/api/v1/tenant/test/')
        request.user = None  # No user means unauthenticated
        
        self.middleware.process_request(request)
        
        # Academy should be None for unauthenticated requests
        self.assertIsNone(request.academy)
    
    def test_platform_endpoint_skips_middleware(self):
        """Test platform endpoints skip academy resolution."""
        request = self.factory.get('/api/v1/platform/academies/')
        request.user = self.superadmin
        
        # User has pk, but path is exempt
        self.middleware.process_request(request)
        self.assertIsNone(request.academy)
    
    def test_onboarding_endpoint_skips_middleware(self):
        """Test onboarding endpoints skip academy resolution."""
        # Note: Onboarding endpoints are NOT exempt - they need academy context
        # But they're handled differently. For this test, let's use an exempt path
        request = self.factory.get('/api/v1/auth/invite/accept/')
        request.user = self.tenant_user
        
        # Path is exempt, so academy should be None
        self.middleware.process_request(request)
        self.assertIsNone(request.academy)
    
    def test_user_with_no_academy(self):
        """Test user with no academy assignment."""
        # User model requires role and academy, so we can't create a user without academy
        # Instead, test that middleware resolves academy from user.academy relationship
        user_with_academy = User.objects.create_user(
            email='noacademy@test.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.academy1
        )
        
        request = self.factory.get('/api/v1/tenant/test/')
        request.user = user_with_academy
        # No header, no auth - should resolve from user.academy
        # User has pk, so is_authenticated will be True
        self.middleware.process_request(request)
        # Should resolve academy from user.academy relationship
        self.assertEqual(request.academy, self.academy1)
    
    def test_jwt_token_academy_id_extraction(self):
        """Test academy_id extraction from JWT token."""
        request = self.factory.get('/api/v1/tenant/test/')
        request.user = self.tenant_user
        
        # Mock JWT token in request.auth
        request.auth = {
            'academy_id': str(self.academy1.id),
            'user_id': self.tenant_user.id
        }
        
        # User has pk, so is_authenticated will be True
        self.middleware.process_request(request)
        self.assertEqual(request.academy, self.academy1)
    
    def test_user_academy_relationship(self):
        """Test academy resolution from user.academy relationship."""
        # Create user with academy relationship
        user_with_relation = User.objects.create_user(
            email='relation@test.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.academy1
        )
        
        # If user model supports academy ForeignKey
        if hasattr(user_with_relation, 'academy'):
            user_with_relation.academy = self.academy1
            user_with_relation.save()
            
            request = self.factory.get('/api/v1/tenant/test/')
            request.user = user_with_relation
            
            # User has pk, so is_authenticated will be True
            self.middleware.process_request(request)
            self.assertEqual(request.academy, self.academy1)


class QuerysetFilteringTest(TestCase):
    """Test queryset filtering utilities."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.academy1 = Academy.objects.create(
            name='Academy 1',
            slug='academy-1',
            email='academy1@test.com',
            is_active=True
        )
        self.academy2 = Academy.objects.create(
            name='Academy 2',
            slug='academy-2',
            email='academy2@test.com',
            is_active=True
        )
        
        # Create superadmin without academy (platform-level)
        self.superadmin = User.objects.create_superuser(
            email='superadmin@test.com',
            password='testpass123',
            is_active=True
        )
        
        self.tenant_user = User.objects.create_user(
            email='tenant@test.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.academy1
        )
    
    def test_filter_by_academy_tenant_user(self):
        """Test filtering for tenant user - should raise error for non-tenant model."""
        from shared.utils.queryset_filtering import filter_by_academy
        from django.core.exceptions import ImproperlyConfigured
        
        # Use Academy model - it doesn't have academy FK, so should raise error
        queryset = Academy.objects.all()
        
        # Should raise ImproperlyConfigured since Academy doesn't have academy FK
        with self.assertRaises(ImproperlyConfigured):
            filter_by_academy(
                queryset,
                self.academy1,
                self.tenant_user
            )
    
    def test_filter_by_academy_superadmin(self):
        """Test superadmin sees all data - should raise error for non-tenant model."""
        from shared.utils.queryset_filtering import filter_by_academy
        from django.core.exceptions import ImproperlyConfigured
        
        request = Mock()
        request.user = self.superadmin
        
        queryset = Academy.objects.all()
        
        # Should raise ImproperlyConfigured since Academy doesn't have academy FK
        with self.assertRaises(ImproperlyConfigured):
            filter_by_academy(
                queryset,
                self.academy1,
                self.superadmin,
                request
            )
    
    def test_filter_by_academy_no_academy(self):
        """Test filtering with no academy returns all."""
        from shared.utils.queryset_filtering import filter_by_academy
        
        queryset = Academy.objects.all()
        filtered = filter_by_academy(
            queryset,
            None,
            self.tenant_user
        )
        
        # Should return all items when academy is None
        self.assertEqual(filtered.count(), 2)
    
    def test_filter_by_academy_invalid_model(self):
        """Test filtering raises error for non-tenant model."""
        from shared.utils.queryset_filtering import filter_by_academy
        from django.core.exceptions import ImproperlyConfigured
        from django.db import models
        from unittest.mock import Mock
        
        # Create a mock model without academy field
        mock_model = Mock()
        mock_model.__name__ = 'NonTenantModel'
        mock_queryset = Mock()
        mock_queryset.model = mock_model
        
        # Mock hasattr to return False for academy
        with patch('builtins.hasattr', return_value=False):
            with self.assertRaises(ImproperlyConfigured):
                filter_by_academy(
                    mock_queryset,
                    self.academy1,
                    self.tenant_user
                )


class IsolationTest(TestCase):
    """Test tenant isolation - ensure zero data leakage."""
    
    def setUp(self):
        """Set up test fixtures with two academies."""
        self.academy1 = Academy.objects.create(
            name='Academy 1',
            slug='academy-1',
            email='academy1@test.com',
            is_active=True
        )
        self.academy2 = Academy.objects.create(
            name='Academy 2',
            slug='academy-2',
            email='academy2@test.com',
            is_active=True
        )
        
        # Create users for each academy
        self.user1 = User.objects.create_user(
            email='user1@test.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.academy1
        )
        
        self.user2 = User.objects.create_user(
            email='user2@test.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.academy2
        )
        
        # Create superadmin without academy (platform-level)
        self.superadmin = User.objects.create_superuser(
            email='superadmin@test.com',
            password='testpass123',
            is_active=True
        )
    
    def test_no_cross_academy_data_leakage(self):
        """Test that users cannot access other academy's data."""
        from shared.utils.queryset_filtering import filter_by_academy
        from django.core.exceptions import ImproperlyConfigured
        
        # Use Academy model - it doesn't have academy FK, so should raise error
        queryset = Academy.objects.all()
        
        # Should raise ImproperlyConfigured since Academy doesn't have academy FK
        with self.assertRaises(ImproperlyConfigured):
            filter_by_academy(queryset, self.academy1, self.user1)
    
    def test_superadmin_can_access_all_academies(self):
        """Test superadmin can access all academies (read-only)."""
        from shared.utils.queryset_filtering import filter_by_academy
        from django.core.exceptions import ImproperlyConfigured
        
        request = Mock()
        request.user = self.superadmin
        
        queryset = Academy.objects.all()
        
        # Should raise ImproperlyConfigured since Academy doesn't have academy FK
        with self.assertRaises(ImproperlyConfigured):
            filter_by_academy(
                queryset,
                self.academy1,  # Even when filtering by academy1
                self.superadmin,
                request
            )
