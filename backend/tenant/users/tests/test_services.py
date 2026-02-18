"""
Tests for UserService business logic.
"""
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch, MagicMock
from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from tenant.onboarding.models import Location
from tenant.users.models import User, InviteToken
from tenant.users.services import UserService
from shared.services.quota import QuotaExceededError


class UserServiceTest(TestCase):
    """Test UserService methods."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
            onboarding_completed=True
        )
        
        # Create plan and subscription for quota checking
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
        self.subscription = Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )
        
        self.created_by = User.objects.create_user(
            email="admin@example.com",
            role=User.Role.ADMIN,
            academy=self.academy,
            is_active=True,
            is_verified=True
        )
    
    def test_create_admin_user_with_invite(self):
        """Test creating an admin user with invite."""
        with patch('tenant.users.services.UserService.send_invite_email_async'):
            user, token = UserService.create_user_with_invite(
                role=User.Role.ADMIN,
                email="newadmin@example.com",
                academy=self.academy,
                created_by=self.created_by,
                profile_data={}
            )
            
            self.assertEqual(user.email, "newadmin@example.com")
            self.assertEqual(user.role, User.Role.ADMIN)
            self.assertEqual(user.academy, self.academy)
            self.assertFalse(user.is_active)
            self.assertFalse(user.is_verified)
            self.assertTrue(hasattr(user, 'admin_profile'))
            self.assertIsNotNone(token)
            self.assertIsInstance(token, str)
    
    def test_create_coach_user_with_invite(self):
        """Test creating a coach user with invite."""
        location = Location.objects.create(
            academy=self.academy,
            name="Main Facility"
        )
        
        with patch('tenant.users.services.UserService.send_invite_email_async'):
            user, token = UserService.create_user_with_invite(
                role=User.Role.COACH,
                email="coach@example.com",
                academy=self.academy,
                created_by=self.created_by,
                profile_data={
                    'type': 'Head Coach',
                    'location_id': location.id
                }
            )
            
            self.assertEqual(user.email, "coach@example.com")
            self.assertEqual(user.role, User.Role.COACH)
            self.assertTrue(hasattr(user, 'coach_profile'))
            self.assertEqual(user.user_coach_profile.type, 'Head Coach')
            self.assertEqual(user.user_coach_profile.location, location)
    
    def test_create_parent_user_with_invite(self):
        """Test creating a parent user with invite."""
        with patch('tenant.users.services.UserService.send_invite_email_async'):
            user, token = UserService.create_user_with_invite(
                role=User.Role.PARENT,
                email="parent@example.com",
                academy=self.academy,
                created_by=self.created_by,
                profile_data={
                    'phone': '+1234567890'
                }
            )
            
            self.assertEqual(user.email, "parent@example.com")
            self.assertEqual(user.role, User.Role.PARENT)
            self.assertTrue(hasattr(user, 'parent_profile'))
            self.assertEqual(user.parent_profile.phone, '+1234567890')
    
    def test_create_user_email_uniqueness(self):
        """Test email uniqueness validation."""
        User.objects.create_user(
            email="existing@example.com",
            role=User.Role.ADMIN,
            academy=self.academy
        )
        
        with self.assertRaises(ValidationError):
            UserService.create_user_with_invite(
                role=User.Role.ADMIN,
                email="existing@example.com",
                academy=self.academy,
                created_by=self.created_by
            )
    
    def test_create_user_quota_check(self):
        """Test quota checking before user creation."""
        # Create max admins
        for i in range(5):
            User.objects.create_user(
                email=f"admin{i}@example.com",
                role=User.Role.ADMIN,
                academy=self.academy,
                is_active=True
            )
        
        # Try to create one more - should fail
        with self.assertRaises(QuotaExceededError):
            UserService.create_user_with_invite(
                role=User.Role.ADMIN,
                email="newadmin@example.com",
                academy=self.academy,
                created_by=self.created_by
            )
    
    def test_generate_invite_token(self):
        """Test invite token generation."""
        user = User.objects.create_user(
            email="user@example.com",
            role=User.Role.ADMIN,
            academy=self.academy
        )
        
        token = UserService.generate_invite_token(user, created_by=self.created_by)
        
        self.assertIsNotNone(token)
        self.assertIsInstance(token, str)
        
        # Check token was created
        invite_token = InviteToken.objects.get(user=user)
        self.assertIsNotNone(invite_token)
        self.assertTrue(invite_token.is_valid())
        self.assertEqual(invite_token.created_by, self.created_by)
    
    def test_generate_invite_token_invalidates_old(self):
        """Test generating new token invalidates old ones."""
        user = User.objects.create_user(
            email="user@example.com",
            role=User.Role.ADMIN,
            academy=self.academy
        )
        
        # Generate first token
        token1 = UserService.generate_invite_token(user, created_by=self.created_by)
        invite_token1 = InviteToken.objects.get(user=user, used_at__isnull=True)
        
        # Generate second token
        token2 = UserService.generate_invite_token(user, created_by=self.created_by)
        
        # First token should be invalidated
        invite_token1.refresh_from_db()
        self.assertIsNotNone(invite_token1.used_at)
        
        # Second token should be valid
        invite_token2 = InviteToken.objects.get(user=user, used_at__isnull=True)
        self.assertTrue(invite_token2.is_valid())
    
    def test_accept_invite(self):
        """Test accepting invite."""
        user = User.objects.create_user(
            email="user@example.com",
            role=User.Role.ADMIN,
            academy=self.academy
        )
        
        token = UserService.generate_invite_token(user, created_by=self.created_by)
        
        # Accept invite
        accepted_user = UserService.accept_invite(token, "SecurePassword123!")
        
        self.assertEqual(accepted_user, user)
        self.assertTrue(accepted_user.is_active)
        self.assertTrue(accepted_user.is_verified)
        self.assertTrue(accepted_user.check_password("SecurePassword123!"))
        
        # Token should be marked as used
        invite_token = InviteToken.objects.get(user=user)
        self.assertIsNotNone(invite_token.used_at)
    
    def test_accept_invite_invalid_token(self):
        """Test accepting invite with invalid token."""
        with self.assertRaises(ValidationError):
            UserService.accept_invite("invalid-token", "Password123!")
    
    def test_accept_invite_expired_token(self):
        """Test accepting invite with expired token."""
        user = User.objects.create_user(
            email="user@example.com",
            role=User.Role.ADMIN,
            academy=self.academy
        )
        
        token = InviteToken.generate_token()
        token_hash = InviteToken.hash_token(token)
        expires_at = timezone.now() - timedelta(hours=1)  # Expired
        
        InviteToken.objects.create(
            user=user,
            academy=self.academy,
            token_hash=token_hash,
            expires_at=expires_at
        )
        
        with self.assertRaises(ValidationError):
            UserService.accept_invite(token, "Password123!")
    
    def test_resend_invite(self):
        """Test resending invite."""
        user = User.objects.create_user(
            email="user@example.com",
            role=User.Role.ADMIN,
            academy=self.academy
        )
        
        # Generate first token
        token1 = UserService.generate_invite_token(user, created_by=self.created_by)
        
        # Resend invite
        token2 = UserService.resend_invite(user, created_by=self.created_by)
        
        self.assertNotEqual(token1, token2)
        
        # First token should be invalidated
        old_token = InviteToken.objects.filter(user=user, used_at__isnull=False).first()
        self.assertIsNotNone(old_token)
        
        # New token should be valid
        new_token = InviteToken.objects.get(user=user, used_at__isnull=True)
        self.assertTrue(new_token.is_valid())
    
    def test_resend_invite_active_user(self):
        """Test resending invite for already active user should fail."""
        user = User.objects.create_user(
            email="user@example.com",
            role=User.Role.ADMIN,
            academy=self.academy,
            is_active=True,
            is_verified=True
        )
        
        with self.assertRaises(ValidationError):
            UserService.resend_invite(user, created_by=self.created_by)
