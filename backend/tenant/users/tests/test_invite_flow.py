"""
End-to-end tests for invite flow.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch, MagicMock
from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from tenant.users.models import User, InviteToken
from tenant.users.services import UserService

# Optional Celery import
try:
    from celery_app.tasks import send_invite_email
except ImportError:
    send_invite_email = None

User = get_user_model()


class InviteFlowTest(TestCase):
    """End-to-end tests for invite flow."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
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
    
    def test_complete_invite_flow(self):
        """Test complete invite flow from creation to acceptance."""
        # Step 1: Create user with invite
        # Note: send_invite_email_async is called by the view, not the service
        user, token = UserService.create_user_with_invite(
            role=User.Role.ADMIN,
            email="newuser@example.com",
            academy=self.academy,
            created_by=self.created_by,
            profile_data={}
        )
        
        # Verify user created
        self.assertFalse(user.is_active)
        self.assertFalse(user.is_verified)
        
        # Verify token created
        invite_token = InviteToken.objects.get(user=user, used_at__isnull=True)
        self.assertTrue(invite_token.is_valid())
        self.assertEqual(invite_token.created_by, self.created_by)
        
        # Step 2: Accept invite
        accepted_user = UserService.accept_invite(token, "SecurePassword123!")
        
        # Verify user activated
        self.assertTrue(accepted_user.is_active)
        self.assertTrue(accepted_user.is_verified)
        self.assertTrue(accepted_user.check_password("SecurePassword123!"))
        
        # Verify token marked as used
        invite_token.refresh_from_db()
        self.assertIsNotNone(invite_token.used_at)
    
    def test_invite_token_expiration(self):
        """Test invite token expiration."""
        user = User.objects.create_user(
            email="user@example.com",
            role=User.Role.ADMIN,
            academy=self.academy
        )
        
        # Create expired token
        token = InviteToken.generate_token()
        token_hash = InviteToken.hash_token(token)
        expires_at = timezone.now() - timedelta(hours=1)
        
        InviteToken.objects.create(
            user=user,
            academy=self.academy,
            token_hash=token_hash,
            expires_at=expires_at
        )
        
        # Try to accept expired token
        with self.assertRaises(Exception):
            UserService.accept_invite(token, "Password123!")
    
    def test_invite_token_single_use(self):
        """Test invite token can only be used once."""
        user = User.objects.create_user(
            email="user@example.com",
            role=User.Role.ADMIN,
            academy=self.academy
        )
        
        token = UserService.generate_invite_token(user, created_by=self.created_by)
        
        # Accept token first time
        UserService.accept_invite(token, "Password123!")
        
        # Try to accept same token again - should fail
        with self.assertRaises(Exception):
            UserService.accept_invite(token, "NewPassword123!")
    
    def test_resend_invite_invalidates_old(self):
        """Test resending invite invalidates old token."""
        user = User.objects.create_user(
            email="user@example.com",
            role=User.Role.ADMIN,
            academy=self.academy
        )
        
        # Generate first token
        token1 = UserService.generate_invite_token(user, created_by=self.created_by)
        invite_token1 = InviteToken.objects.get(user=user, used_at__isnull=True)
        
        # Resend invite
        token2 = UserService.resend_invite(user, created_by=self.created_by)
        
        # First token should be invalidated
        invite_token1.refresh_from_db()
        self.assertIsNotNone(invite_token1.used_at)
        
        # Second token should work
        UserService.accept_invite(token2, "Password123!")
        user.refresh_from_db()
        self.assertTrue(user.is_active)
    
    @patch('django.core.mail.send_mail')
    @patch('tenant.users.services.send_invite_email', None)  # Force sync fallback
    def test_email_sending(self, mock_send_mail):
        """Test email is sent when invite is created."""
        user = User.objects.create_user(
            email="user@example.com",
            role=User.Role.ADMIN,
            academy=self.academy
        )
        
        token = UserService.generate_invite_token(user, created_by=self.created_by)
        
        # Send email (will use sync fallback if Celery not available)
        UserService.send_invite_email_async(user, token)
        
        # Verify email was sent
        mock_send_mail.assert_called_once()
        call_args = mock_send_mail.call_args
        # call_args is (args_tuple, kwargs_dict)
        if call_args[0]:  # If positional args exist
            message = call_args[0][1] if len(call_args[0]) > 1 else ''
        else:  # If only keyword args
            message = call_args[1].get('message', '')
        self.assertEqual(call_args[1]['recipient_list'], [user.email])
        self.assertIn(self.academy.name, message)  # Academy name in message
    
    def test_multiple_invites_same_user(self):
        """Test that only one active token exists per user."""
        user = User.objects.create_user(
            email="user@example.com",
            role=User.Role.ADMIN,
            academy=self.academy
        )
        
        # Generate multiple tokens
        token1 = UserService.generate_invite_token(user, created_by=self.created_by)
        token2 = UserService.generate_invite_token(user, created_by=self.created_by)
        token3 = UserService.generate_invite_token(user, created_by=self.created_by)
        
        # Only the last token should be active
        active_tokens = InviteToken.objects.filter(
            user=user,
            used_at__isnull=True,
            expires_at__gt=timezone.now()
        )
        self.assertEqual(active_tokens.count(), 1)
        
        # Last token should work
        UserService.accept_invite(token3, "Password123!")
        user.refresh_from_db()
        self.assertTrue(user.is_active)
