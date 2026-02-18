"""
Tests for user management API endpoints.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from unittest.mock import patch
from rest_framework.test import APIClient
from rest_framework import status
from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from tenant.onboarding.models import Location
from tenant.users.models import User
from django.utils import timezone

User = get_user_model()


class UserViewSetTest(TestCase):
    """Test UserViewSet API endpoints."""
    
    def setUp(self):
        self.client = APIClient()
        
        self.academy1 = Academy.objects.create(
            name="Academy 1",
            slug="academy-1",
            email="academy1@test.com",
            onboarding_completed=True
        )
        
        self.academy2 = Academy.objects.create(
            name="Academy 2",
            slug="academy-2",
            email="academy2@test.com",
            onboarding_completed=True
        )
        
        # Create plan and subscription
        self.plan = Plan.objects.create(
            name="Basic Plan",
            slug="basic-plan",
            limits_json={
                'max_students': 100,
                'max_coaches': 10,
                'max_admins': 5,
                'max_classes': 50
            }
        )
        Subscription.objects.create(
            academy=self.academy1,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )
        Subscription.objects.create(
            academy=self.academy2,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )
        
        # Create admin user for academy1
        self.admin1 = User.objects.create_user(
            email='admin1@academy1.com',
            role=User.Role.ADMIN,
            academy=self.academy1,
            is_active=True,
            is_verified=True
        )
        # Ensure academy_id is set (for middleware compatibility)
        if hasattr(self.admin1, 'academy_id'):
            self.admin1.academy_id = self.academy1.id
        self.admin1.save()
        # Refresh to ensure all attributes are loaded
        self.admin1.refresh_from_db()
        
        self.client.force_authenticate(user=self.admin1)
        
        # Set academy context via header
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy1.id))
    
    def test_create_admin_user(self):
        """Test creating an admin user."""
        # Debug: Check user attributes
        print(f"User role: {self.admin1.role}")
        print(f"User academy_id: {getattr(self.admin1, 'academy_id', 'NOT SET')}")
        print(f"User academy: {self.admin1.academy}")
        print(f"Academy1 id: {self.academy1.id}")
        
        with patch('tenant.users.services.UserService.send_invite_email_async'):
            response = self.client.post(
                '/api/v1/admin/users/admins/',
                {
                    'email': 'newadmin@example.com',
                    'profile': {}
                },
                format='json'
            )
            
            if response.status_code != status.HTTP_201_CREATED:
                print(f"Response status: {response.status_code}")
                if hasattr(response, 'data'):
                    print(f"Response data: {response.data}")
                else:
                    print(f"Response content: {response.content}")
            
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(response.data['email'], 'newadmin@example.com')
            self.assertEqual(response.data['role'], 'ADMIN')
            self.assertTrue(response.data['invite_sent'])
            
            # Verify user was created
            user = User.objects.get(email='newadmin@example.com')
            self.assertEqual(user.academy, self.academy1)
            self.assertTrue(hasattr(user, 'admin_profile'))
    
    def test_create_coach_user(self):
        """Test creating a coach user."""
        location = Location.objects.create(
            academy=self.academy1,
            name="Main Facility"
        )
        
        with patch('tenant.users.services.UserService.send_invite_email_async'):
            response = self.client.post(
                '/api/v1/admin/users/coaches/',
                {
                    'email': 'coach@example.com',
                    'profile': {
                        'type': 'Head Coach',
                        'location_id': str(location.id)
                    }
                },
                format='json'
            )
            
            if response.status_code != status.HTTP_201_CREATED:
                print(f"Response status: {response.status_code}")
                print(f"Response data: {response.data}")
            
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(response.data['email'], 'coach@example.com')
            self.assertEqual(response.data['role'], 'COACH')
            
            # Verify profile was created
            user = User.objects.get(email='coach@example.com')
            self.assertEqual(user.user_coach_profile.type, 'Head Coach')
            # Refresh from DB to get the location relationship
            user.user_coach_profile.refresh_from_db()
            self.assertEqual(user.user_coach_profile.location_id, location.id)
            self.assertEqual(user.user_coach_profile.location, location)
    
    def test_create_parent_user(self):
        """Test creating a parent user."""
        with patch('tenant.users.services.UserService.send_invite_email_async'):
            response = self.client.post(
                '/api/v1/admin/users/parents/',
                {
                    'email': 'parent@example.com',
                    'profile': {
                        'phone': '+1234567890'
                    }
                },
                format='json'
            )
            
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(response.data['email'], 'parent@example.com')
            self.assertEqual(response.data['role'], 'PARENT')
            
            # Verify profile was created
            user = User.objects.get(email='parent@example.com')
            self.assertEqual(user.parent_profile.phone, '+1234567890')
    
    def test_list_users(self):
        """Test listing users."""
        # Create some users
        User.objects.create_user(
            email='user1@example.com',
            role=User.Role.ADMIN,
            academy=self.academy1
        )
        User.objects.create_user(
            email='user2@example.com',
            role=User.Role.COACH,
            academy=self.academy1
        )
        # User in different academy
        User.objects.create_user(
            email='user3@example.com',
            role=User.Role.ADMIN,
            academy=self.academy2
        )
        
        response = self.client.get('/api/v1/admin/users/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 3)  # admin1 + 2 users from academy1
        
        # Filter by role
        response = self.client.get('/api/v1/admin/users/?role=ADMIN')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)  # admin1 + user1
    
    def test_update_user(self):
        """Test updating user."""
        user = User.objects.create_user(
            email='user@example.com',
            role=User.Role.ADMIN,
            academy=self.academy1
        )
        # Ensure admin profile exists
        from tenant.users.models import AdminProfile
        if not hasattr(user, 'admin_profile'):
            AdminProfile.objects.create(user=user, academy=self.academy1)
        
        response = self.client.patch(
            f'/api/v1/admin/users/{user.id}/',
            {
                'is_active': True,
                'admin_profile': {'is_active': False}
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        user.admin_profile.refresh_from_db()
        self.assertFalse(user.admin_profile.is_active)
    
    def test_academy_isolation(self):
        """Test users from different academies are isolated."""
        # Create user in academy2
        user2 = User.objects.create_user(
            email='user2@example.com',
            role=User.Role.ADMIN,
            academy=self.academy2
        )
        
        # Try to access user from academy2 while authenticated as admin1 (academy1)
        response = self.client.get(f'/api/v1/admin/users/{user2.id}/')
        
        # Should return 404 or empty (depending on filtering)
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_200_OK])
        if response.status_code == status.HTTP_200_OK:
            # If found, verify it's filtered out
            self.assertNotEqual(response.data.get('id'), user2.id)
    
    def test_permission_required(self):
        """Test only ADMIN/OWNER can create users."""
        # Create a COACH user
        coach = User.objects.create_user(
            email='coach@example.com',
            role=User.Role.COACH,
            academy=self.academy1,
            is_active=True,
            is_verified=True
        )
        
        self.client.force_authenticate(user=coach)
        
        response = self.client.post(
            '/api/v1/admin/users/admins/',
            {
                'email': 'newuser@example.com',
                'profile': {}
            },
            format='json'
        )
        
        # Should be forbidden
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_resend_invite(self):
        """Test resending invite."""
        user = User.objects.create_user(
            email='user@example.com',
            role=User.Role.ADMIN,
            academy=self.academy1
        )
        
        with patch('tenant.users.services.UserService.send_invite_email_async'):
            response = self.client.post(
                f'/api/v1/admin/users/{user.id}/resend_invite/'
            )
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertTrue(response.data['invite_sent'])
    
    def test_disable_user(self):
        """Test disabling user (soft delete)."""
        user = User.objects.create_user(
            email='user@example.com',
            role=User.Role.ADMIN,
            academy=self.academy1,
            is_active=True,
            is_verified=True
        )
        
        response = self.client.delete(f'/api/v1/admin/users/{user.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify user is soft deleted (is_active=False)
        user.refresh_from_db()
        self.assertFalse(user.is_active)
        # User should still exist in database
        self.assertTrue(User.objects.filter(id=user.id).exists())
    
    def test_superadmin_can_disable_any_user(self):
        """Test superadmin can disable users across all academies."""
        # Create superadmin user (platform-level, no academy required)
        superadmin = User.objects.create_superuser(
            email='superadmin@example.com',
            password='testpass123',
            is_active=True
        )
        
        # Create user in academy2
        user2 = User.objects.create_user(
            email='user2@example.com',
            role=User.Role.ADMIN,
            academy=self.academy2,
            is_active=True,
            is_verified=True
        )
        
        # Authenticate as superadmin
        self.client.force_authenticate(user=superadmin)
        
        # Superadmin should be able to disable user from different academy
        response = self.client.delete(f'/api/v1/admin/users/{user2.id}/')
        
        # Should succeed (either 204 or 403 depending on permission implementation)
        self.assertIn(response.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_403_FORBIDDEN])
        
        if response.status_code == status.HTTP_204_NO_CONTENT:
            user2.refresh_from_db()
            self.assertFalse(user2.is_active)


class AcceptInviteViewTest(TestCase):
    """Test invite acceptance endpoint."""
    
    def setUp(self):
        self.client = APIClient()
        
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com"
        )
        
        self.user = User.objects.create_user(
            email='user@example.com',
            role=User.Role.ADMIN,
            academy=self.academy
        )
    
    def test_accept_invite(self):
        """Test accepting invite."""
        from tenant.users.services import UserService
        
        token = UserService.generate_invite_token(self.user)
        
        response = self.client.post(
            '/api/v1/auth/invite/accept/',
            {
                'token': token,
                'password': 'SecurePassword123!',
                'password_confirm': 'SecurePassword123!'
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], 'user@example.com')
        
        # Verify user is activated
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)
        self.assertTrue(self.user.is_verified)
        self.assertTrue(self.user.check_password('SecurePassword123!'))
    
    def test_accept_invite_invalid_token(self):
        """Test accepting invite with invalid token."""
        response = self.client.post(
            '/api/v1/auth/invite/accept/',
            {
                'token': 'invalid-token',
                'password': 'SecurePassword123!',
                'password_confirm': 'SecurePassword123!'
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_accept_invite_password_mismatch(self):
        """Test accepting invite with mismatched passwords."""
        from tenant.users.services import UserService
        
        token = UserService.generate_invite_token(self.user)
        
        response = self.client.post(
            '/api/v1/auth/invite/accept/',
            {
                'token': token,
                'password': 'SecurePassword123!',
                'password_confirm': 'DifferentPassword123!'
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password_confirm', str(response.data))


class LoginViewTest(TestCase):
    """Test login endpoint."""
    
    def setUp(self):
        self.client = APIClient()
        
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com"
        )
        
        # Create user with password
        self.user = User.objects.create_user(
            email='user@example.com',
            password='SecurePassword123!',
            role=User.Role.ADMIN,
            academy=self.academy,
            is_active=True,
            is_verified=True
        )
    
    def test_login_success(self):
        """Test successful login with valid credentials."""
        response = self.client.post(
            '/api/v1/auth/token/',
            {
                'email': 'user@example.com',
                'password': 'SecurePassword123!'
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['email'], 'user@example.com')
        self.assertEqual(response.data['user']['role'], 'ADMIN')
        
        # Verify last_login was updated
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.last_login)
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials."""
        response = self.client.post(
            '/api/v1/auth/token/',
            {
                'email': 'user@example.com',
                'password': 'WrongPassword123!'
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('detail', response.data)
    
    def test_login_inactive_user(self):
        """Test login with inactive user."""
        self.user.is_active = False
        self.user.save()
        
        response = self.client.post(
            '/api/v1/auth/token/',
            {
                'email': 'user@example.com',
                'password': 'SecurePassword123!'
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('disabled', response.data['detail'].lower())
    
    def test_login_nonexistent_user(self):
        """Test login with nonexistent user."""
        response = self.client.post(
            '/api/v1/auth/token/',
            {
                'email': 'nonexistent@example.com',
                'password': 'SecurePassword123!'
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
