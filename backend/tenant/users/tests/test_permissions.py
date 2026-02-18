"""
Tests for user management permissions.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from saas_platform.tenants.models import Academy
from tenant.users.models import User
from tenant.users.permissions import CanCreateUsers

User = get_user_model()


class UserPermissionsTest(TestCase):
    """Test permission enforcement for user management."""
    
    def setUp(self):
        self.client = APIClient()
        
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
            onboarding_completed=True
        )
    
    def test_admin_can_create_users(self):
        """Test ADMIN can create users."""
        admin = User.objects.create_user(
            email='admin@example.com',
            role=User.Role.ADMIN,
            academy=self.academy,
            is_active=True,
            is_verified=True
        )
        
        permission = CanCreateUsers()
        # Create a mock request object
        from unittest.mock import MagicMock
        request = MagicMock()
        request.user = admin
        request.academy = self.academy
        
        self.assertTrue(permission.has_permission(request, None))
    
    def test_coach_cannot_create_users(self):
        """Test COACH cannot create users."""
        coach = User.objects.create_user(
            email='coach@example.com',
            role=User.Role.COACH,
            academy=self.academy,
            is_active=True,
            is_verified=True
        )
        
        permission = CanCreateUsers()
        from unittest.mock import MagicMock
        request = MagicMock()
        request.user = coach
        request.academy = self.academy
        
        self.assertFalse(permission.has_permission(request, None))
    
    def test_parent_cannot_create_users(self):
        """Test PARENT cannot create users."""
        parent = User.objects.create_user(
            email='parent@example.com',
            role=User.Role.PARENT,
            academy=self.academy,
            is_active=True,
            is_verified=True
        )
        
        permission = CanCreateUsers()
        from unittest.mock import MagicMock
        request = MagicMock()
        request.user = parent
        request.academy = self.academy
        
        self.assertFalse(permission.has_permission(request, None))
    
    def test_unauthenticated_cannot_create_users(self):
        """Test unauthenticated users cannot create users."""
        permission = CanCreateUsers()
        request = type('Request', (), {
            'user': None,
            'academy': self.academy
        })()
        
        self.assertFalse(permission.has_permission(request, None))
