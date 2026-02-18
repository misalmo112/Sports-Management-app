"""
Tests for User, Profile, and InviteToken models.
"""
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from saas_platform.tenants.models import Academy
from tenant.onboarding.models import Location
from tenant.users.models import User, AdminProfile, CoachProfile, ParentProfile, InviteToken


class UserModelTest(TestCase):
    """Test User model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com"
        )
    
    def test_create_user(self):
        """Test creating a user."""
        user = User.objects.create_user(
            email="user@example.com",
            role=User.Role.ADMIN,
            academy=self.academy
        )
        self.assertEqual(user.email, "user@example.com")
        self.assertEqual(user.role, User.Role.ADMIN)
        self.assertEqual(user.academy, self.academy)
        self.assertFalse(user.is_active)  # Inactive until invite accepted
        self.assertFalse(user.is_verified)  # Not verified until invite accepted
    
    def test_user_email_uniqueness(self):
        """Test email must be unique globally."""
        User.objects.create_user(
            email="user@example.com",
            role=User.Role.ADMIN,
            academy=self.academy
        )
        
        # Same email should fail
        with self.assertRaises(Exception):
            User.objects.create_user(
                email="user@example.com",
                role=User.Role.COACH,
                academy=self.academy
            )
    
    def test_user_email_normalization(self):
        """Test email is normalized to lowercase."""
        user = User.objects.create_user(
            email="USER@EXAMPLE.COM",
            role=User.Role.ADMIN,
            academy=self.academy
        )
        self.assertEqual(user.email, "user@example.com")
    
    def test_user_str(self):
        """Test user string representation."""
        user = User.objects.create_user(
            email="user@example.com",
            role=User.Role.ADMIN,
            academy=self.academy
        )
        self.assertIn("user@example.com", str(user))
        self.assertIn("ADMIN", str(user))
    
    def test_create_superuser_without_academy(self):
        """Test creating a superuser without academy (platform-level)."""
        superuser = User.objects.create_superuser(
            email="superadmin@example.com",
            password="testpass123",
            is_active=True
        )
        self.assertTrue(superuser.is_superuser)
        self.assertTrue(superuser.is_staff)
        self.assertIsNone(superuser.academy)
    
    def test_non_superuser_requires_academy(self):
        """Test that non-superuser users must have an academy."""
        with self.assertRaises(ValidationError):
            user = User(
                email="user@example.com",
                role=User.Role.ADMIN,
                academy=None,
                is_superuser=False
            )
            user.full_clean()
            user.save()
    
    def test_superuser_can_have_null_academy(self):
        """Test that superusers can have null academy."""
        superuser = User.objects.create_superuser(
            email="superadmin@example.com",
            password="testpass123",
            is_active=True
        )
        # Verify academy is None
        self.assertIsNone(superuser.academy)
        # Verify we can still save with None academy
        superuser.save()
        self.assertIsNone(superuser.academy)


class AdminProfileModelTest(TestCase):
    """Test AdminProfile model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com"
        )
        self.user = User.objects.create_user(
            email="admin@example.com",
            role=User.Role.ADMIN,
            academy=self.academy
        )
    
    def test_create_admin_profile(self):
        """Test creating an admin profile."""
        profile = AdminProfile.objects.create(
            user=self.user,
            academy=self.academy
        )
        self.assertEqual(profile.user, self.user)
        self.assertEqual(profile.academy, self.academy)
        self.assertTrue(profile.is_active)
    
    def test_admin_profile_validation(self):
        """Test profile validation."""
        # Create a COACH user
        coach_user = User.objects.create_user(
            email="coach@example.com",
            role=User.Role.COACH,
            academy=self.academy
        )
        
        # Try to create AdminProfile for COACH user - should fail
        with self.assertRaises(ValidationError):
            profile = AdminProfile(user=coach_user, academy=self.academy)
            profile.full_clean()
    
    def test_superuser_cannot_have_profile(self):
        """Test that superusers cannot have tenant profiles."""
        superuser = User.objects.create_superuser(
            email="superadmin@example.com",
            password="testpass123",
            is_active=True
        )
        
        # Try to create AdminProfile for superuser - should fail
        with self.assertRaises(ValidationError):
            profile = AdminProfile(user=superuser, academy=self.academy)
            profile.full_clean()
    
    def test_admin_profile_academy_mismatch(self):
        """Test profile academy must match user academy."""
        academy2 = Academy.objects.create(
            name="Another Academy",
            slug="another-academy",
            email="another@academy.com"
        )
        
        with self.assertRaises(ValidationError):
            profile = AdminProfile(user=self.user, academy=academy2)
            profile.full_clean()


class CoachProfileModelTest(TestCase):
    """Test CoachProfile model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com"
        )
        self.location = Location.objects.create(
            academy=self.academy,
            name="Main Facility"
        )
        self.user = User.objects.create_user(
            email="coach@example.com",
            role=User.Role.COACH,
            academy=self.academy
        )
    
    def test_create_coach_profile(self):
        """Test creating a coach profile."""
        profile = CoachProfile.objects.create(
            user=self.user,
            academy=self.academy,
            type="Head Coach",
            location=self.location
        )
        self.assertEqual(profile.user, self.user)
        self.assertEqual(profile.academy, self.academy)
        self.assertEqual(profile.type, "Head Coach")
        self.assertEqual(profile.location, self.location)
    
    def test_coach_profile_location_validation(self):
        """Test location must belong to same academy."""
        academy2 = Academy.objects.create(
            name="Another Academy",
            slug="another-academy",
            email="another@academy.com"
        )
        location2 = Location.objects.create(
            academy=academy2,
            name="Other Facility"
        )
        
        with self.assertRaises(ValidationError):
            profile = CoachProfile(
                user=self.user,
                academy=self.academy,
                location=location2
            )
            profile.full_clean()


class ParentProfileModelTest(TestCase):
    """Test ParentProfile model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com"
        )
        self.user = User.objects.create_user(
            email="parent@example.com",
            role=User.Role.PARENT,
            academy=self.academy
        )
    
    def test_create_parent_profile(self):
        """Test creating a parent profile."""
        profile = ParentProfile.objects.create(
            user=self.user,
            academy=self.academy,
            phone="+1234567890"
        )
        self.assertEqual(profile.user, self.user)
        self.assertEqual(profile.academy, self.academy)
        self.assertEqual(profile.phone, "+1234567890")


class InviteTokenModelTest(TestCase):
    """Test InviteToken model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com"
        )
        self.user = User.objects.create_user(
            email="user@example.com",
            role=User.Role.ADMIN,
            academy=self.academy
        )
        self.created_by = User.objects.create_user(
            email="admin@example.com",
            role=User.Role.ADMIN,
            academy=self.academy
        )
    
    def test_create_invite_token(self):
        """Test creating an invite token."""
        token = InviteToken.generate_token()
        token_hash = InviteToken.hash_token(token)
        expires_at = timezone.now() + timedelta(hours=48)
        
        invite_token = InviteToken.objects.create(
            user=self.user,
            academy=self.academy,
            token_hash=token_hash,
            expires_at=expires_at,
            created_by=self.created_by
        )
        
        self.assertEqual(invite_token.user, self.user)
        self.assertEqual(invite_token.academy, self.academy)
        self.assertIsNone(invite_token.used_at)
        self.assertTrue(invite_token.is_valid())
    
    def test_token_verification(self):
        """Test token verification."""
        token = InviteToken.generate_token()
        token_hash = InviteToken.hash_token(token)
        
        self.assertTrue(InviteToken.verify_token(token_hash, token))
        self.assertFalse(InviteToken.verify_token(token_hash, "wrong-token"))
    
    def test_token_expiration(self):
        """Test token expiration."""
        token = InviteToken.generate_token()
        token_hash = InviteToken.hash_token(token)
        expires_at = timezone.now() - timedelta(hours=1)  # Expired
        
        invite_token = InviteToken.objects.create(
            user=self.user,
            academy=self.academy,
            token_hash=token_hash,
            expires_at=expires_at
        )
        
        self.assertFalse(invite_token.is_valid())
        self.assertTrue(invite_token.is_expired())
    
    def test_token_mark_as_used(self):
        """Test marking token as used."""
        token = InviteToken.generate_token()
        token_hash = InviteToken.hash_token(token)
        expires_at = timezone.now() + timedelta(hours=48)
        
        invite_token = InviteToken.objects.create(
            user=self.user,
            academy=self.academy,
            token_hash=token_hash,
            expires_at=expires_at
        )
        
        self.assertIsNone(invite_token.used_at)
        invite_token.mark_as_used()
        self.assertIsNotNone(invite_token.used_at)
        self.assertFalse(invite_token.is_valid())
        
        # Try to use again - should fail
        with self.assertRaises(ValidationError):
            invite_token.mark_as_used()
