from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory
from shared.permissions.base import IsSuperadmin
from shared.permissions.platform import IsPlatformAdmin

User = get_user_model()


class IsSuperadminPermissionTest(TestCase):
    """Test IsSuperadmin permission."""
    
    def setUp(self):
        self.factory = APIRequestFactory()
        self.permission = IsSuperadmin()
    
    def test_superadmin_has_permission(self):
        """Test that superadmin has permission."""
        # Create superuser without academy (platform-level superadmin)
        user = User.objects.create_superuser(
            email='superadmin@example.com',
            password='testpass123',
            is_active=True
        )
        
        request = self.factory.get('/')
        request.user = user
        
        self.assertTrue(self.permission.has_permission(request, None))
        # Verify superuser has null academy
        self.assertIsNone(user.academy)
    
    def test_non_superadmin_no_permission(self):
        """Test that non-superadmin does not have permission."""
        # Create academy for user
        from saas_platform.tenants.models import Academy
        academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com'
        )
        
        user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=academy
        )
        # Ensure not superuser
        user.is_superuser = False
        user.save()
        
        request = self.factory.get('/')
        request.user = user
        
        self.assertFalse(self.permission.has_permission(request, None))
    
    def test_unauthenticated_no_permission(self):
        """Test that unauthenticated user does not have permission."""
        request = self.factory.get('/')
        request.user = None
        
        self.assertFalse(self.permission.has_permission(request, None))


class IsPlatformAdminPermissionTest(TestCase):
    """Test IsPlatformAdmin permission."""
    
    def setUp(self):
        self.factory = APIRequestFactory()
        self.permission = IsPlatformAdmin()
    
    def test_superadmin_has_permission(self):
        """Test that superadmin has permission."""
        # Create superuser without academy (platform-level superadmin)
        user = User.objects.create_superuser(
            email='superadmin@example.com',
            password='testpass123',
            is_active=True
        )
        
        request = self.factory.get('/')
        request.user = user
        
        self.assertTrue(self.permission.has_permission(request, None))
        # Verify superuser has null academy
        self.assertIsNone(user.academy)
    
    def test_non_superadmin_no_permission(self):
        """Test that non-superadmin does not have permission."""
        # Create academy for user
        from saas_platform.tenants.models import Academy
        academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com'
        )
        
        user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=academy
        )
        # Ensure not superuser
        user.is_superuser = False
        user.save()
        
        request = self.factory.get('/')
        request.user = user
        
        self.assertFalse(self.permission.has_permission(request, None))
