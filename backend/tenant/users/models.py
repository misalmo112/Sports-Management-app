"""
User models for tenant-level authentication and profiles.

This module defines:
- User: Custom user model extending AbstractUser with email as username
- AdminProfile: Profile for ADMIN users
- CoachProfile: Profile for COACH users
- ParentProfile: Profile for PARENT users
- InviteToken: Secure token-based invite system
"""
import secrets
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from django.core.exceptions import ValidationError
from saas_platform.tenants.models import Academy
from tenant.onboarding.models import Location


class UserManager(BaseUserManager):
    """Custom user manager where email is the unique identifier."""
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and save a user with the given email and password."""
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            # Set unusable password if no password provided (for invite flow)
            user.set_unusable_password()
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser with the given email and password."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        # Role is required on User; platform superusers are not stored as role SUPERADMIN on this model
        extra_fields.setdefault('role', User.Role.ADMIN)
        
        # Academy is optional for superusers
        # If not provided, it will be None (platform-level superadmin)
        # If provided, superuser can still be tied to an academy (for backward compatibility)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Custom user model with email as username.

    Tenant users belong to exactly one academy (except platform superusers).
    """
    
    class Role(models.TextChoices):
        OWNER = 'OWNER', 'Owner'
        ADMIN = 'ADMIN', 'Admin'
        STAFF = 'STAFF', 'Staff'
        COACH = 'COACH', 'Coach'
        PARENT = 'PARENT', 'Parent'
    
    # Remove username field - use email instead
    username = None
    
    # Email is the username field
    email = models.EmailField(
        unique=True,
        db_index=True,
        help_text='Email address used for authentication'
    )
    
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        db_index=True,
        help_text='User role within the academy'
    )

    allowed_modules = models.JSONField(
        null=True,
        blank=True,
        default=None,
        help_text='For STAFF: non-empty list of module keys. NULL = full access for ADMIN only; OWNER always bypasses modules.',
    )
    
    # Academy relationship - nullable for superusers (platform-level admins)
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='users',
        db_index=True,
        null=True,
        blank=True,
        help_text='Academy this user belongs to (null for platform superusers)'
    )
    
    # Status fields
    is_active = models.BooleanField(
        default=False,
        db_index=True,
        help_text='Designates whether this user is active. Users must accept invite to become active.'
    )
    
    is_verified = models.BooleanField(
        default=False,
        db_index=True,
        help_text='Designates whether this user has verified their email by accepting invite.'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    # Academy is only required for non-superusers
    # For superusers, academy can be None (platform-level access)
    REQUIRED_FIELDS = ['role']
    
    class Meta:
        db_table = 'tenant_users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role', 'is_active']),
            models.Index(fields=['academy', 'role']),
            models.Index(fields=['academy', 'is_active']),
        ]
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['email']
    
    def __str__(self):
        return f"{self.email} ({self.role})"
    
    def clean(self):
        """Validate user data."""
        super().clean()
        if self.email:
            self.email = self.email.lower().strip()
        
        # Superusers can have null academy, others cannot
        if not self.is_superuser and not self.academy:
            raise ValidationError('Non-superuser users must have an academy.')

        from shared.permissions.module_keys import validate_allowed_modules_for_staff

        role = self.role
        mods = self.allowed_modules

        if role in (self.Role.COACH, self.Role.PARENT):
            if mods is not None:
                raise ValidationError({'allowed_modules': 'Must be unset for coach and parent users.'})
        elif role == self.Role.STAFF:
            validate_allowed_modules_for_staff(mods)
        elif role in (self.Role.ADMIN, self.Role.OWNER):
            if mods is not None:
                raise ValidationError(
                    {'allowed_modules': 'Only STAFF may have a module list; use unset (null) for OWNER/ADMIN.'}
                )
    
    def save(self, *args, **kwargs):
        """Override save to ensure email is normalized and validate academy requirement."""
        # Superusers can have null academy, others cannot
        if not self.is_superuser and not self.academy:
            raise ValidationError('Non-superuser users must have an academy.')
        self.full_clean(exclude=['password'])  # Exclude password from validation
        super().save(*args, **kwargs)


class AdminProfile(models.Model):
    """
    Profile for ADMIN users.
    
    Stores academy-specific business data for admin users.
    """
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='admin_profile',
        db_index=True
    )
    
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='admin_profiles',
        db_index=True
    )
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_admin_profiles'
        indexes = [
            models.Index(fields=['academy', 'is_active']),
        ]
        verbose_name = 'Admin Profile'
        verbose_name_plural = 'Admin Profiles'
    
    def __str__(self):
        return f"Admin Profile for {self.user.email}"
    
    def clean(self):
        """Validate profile data."""
        if self.user.role != User.Role.ADMIN:
            raise ValidationError('AdminProfile can only be associated with ADMIN users.')
        
        # Superusers should not have profiles (they're platform-level)
        if self.user.is_superuser:
            raise ValidationError('Superusers cannot have tenant profiles.')
        
        if not self.user.academy:
            raise ValidationError('User must have an academy to have a profile.')
        
        if self.academy_id != self.user.academy_id:
            raise ValidationError('Profile academy must match user academy.')
    
    def save(self, *args, **kwargs):
        """Override save to validate."""
        self.full_clean()
        super().save(*args, **kwargs)


class CoachProfile(models.Model):
    """
    Profile for COACH users.
    
    Stores academy-specific business data for coach users.
    """
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='user_coach_profile',
        db_index=True
    )
    
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='coach_profiles',
        db_index=True
    )
    
    # Professional information
    type = models.CharField(
        max_length=255,
        blank=True,
        help_text='Coach type (e.g., Head Coach, Assistant Coach)'
    )
    
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='coaches',
        db_index=True,
        help_text='Primary location for this coach'
    )
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_coach_profiles'
        indexes = [
            models.Index(fields=['academy', 'is_active']),
            models.Index(fields=['location']),
        ]
        verbose_name = 'Coach Profile'
        verbose_name_plural = 'Coach Profiles'
    
    def __str__(self):
        return f"Coach Profile for {self.user.email}"
    
    def clean(self):
        """Validate profile data."""
        if self.user.role != User.Role.COACH:
            raise ValidationError('CoachProfile can only be associated with COACH users.')
        
        # Superusers should not have profiles (they're platform-level)
        if self.user.is_superuser:
            raise ValidationError('Superusers cannot have tenant profiles.')
        
        if not self.user.academy:
            raise ValidationError('User must have an academy to have a profile.')
        
        if self.academy_id != self.user.academy_id:
            raise ValidationError('Profile academy must match user academy.')
        if self.location and self.location.academy_id != self.academy_id:
            raise ValidationError('Location must belong to the same academy.')
    
    def save(self, *args, **kwargs):
        """Override save to validate."""
        self.full_clean()
        super().save(*args, **kwargs)


class ParentProfile(models.Model):
    """
    Profile for PARENT users.
    
    Stores academy-specific business data for parent users.
    """
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='parent_profile',
        db_index=True
    )
    
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='parent_profiles',
        db_index=True
    )
    
    # Contact information
    phone = models.CharField(
        max_length=20,
        blank=True,
        help_text='Phone number for parent'
    )
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_parent_profiles'
        indexes = [
            models.Index(fields=['academy', 'is_active']),
        ]
        verbose_name = 'Parent Profile'
        verbose_name_plural = 'Parent Profiles'
    
    def __str__(self):
        return f"Parent Profile for {self.user.email}"
    
    def clean(self):
        """Validate profile data."""
        if self.user.role != User.Role.PARENT:
            raise ValidationError('ParentProfile can only be associated with PARENT users.')
        
        # Superusers should not have profiles (they're platform-level)
        if self.user.is_superuser:
            raise ValidationError('Superusers cannot have tenant profiles.')
        
        if not self.user.academy:
            raise ValidationError('User must have an academy to have a profile.')
        
        if self.academy_id != self.user.academy_id:
            raise ValidationError('Profile academy must match user academy.')
    
    def save(self, *args, **kwargs):
        """Override save to validate."""
        self.full_clean()
        super().save(*args, **kwargs)


class InviteToken(models.Model):
    """
    Secure token-based invite system for user onboarding.
    
    Tokens are hashed before storage and expire after a configurable period.
    Each user can have only one active token at a time.
    """
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='invite_tokens',
        db_index=True
    )
    
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='invite_tokens',
        db_index=True
    )
    
    # Token is hashed before storage (similar to password hashing)
    token_hash = models.CharField(
        max_length=255,
        db_index=True,
        help_text='Hashed invite token'
    )
    
    token_plain = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text='Plain invite token for admin display'
    )
    
    # Expiration
    expires_at = models.DateTimeField(
        db_index=True,
        help_text='Token expiration timestamp'
    )
    
    # Usage tracking
    used_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text='Timestamp when token was used (null if unused)'
    )
    
    # Audit trail
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_invite_tokens',
        help_text='User who created this invite'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_invite_tokens'
        indexes = [
            models.Index(fields=['token_hash']),
            models.Index(fields=['user', 'used_at']),
            models.Index(fields=['expires_at', 'used_at']),
            models.Index(fields=['academy']),
        ]
        verbose_name = 'Invite Token'
        verbose_name_plural = 'Invite Tokens'
        ordering = ['-created_at']
    
    def __str__(self):
        status = 'used' if self.used_at else 'active' if self.is_valid() else 'expired'
        return f"Invite token for {self.user.email} ({status})"
    
    def is_valid(self):
        """Check if token is valid (not used and not expired)."""
        if self.used_at:
            return False
        return timezone.now() < self.expires_at
    
    def is_expired(self):
        """Check if token is expired."""
        return timezone.now() >= self.expires_at
    
    def mark_as_used(self):
        """Mark token as used."""
        if self.used_at:
            raise ValidationError('Token has already been used.')
        self.used_at = timezone.now()
        self.token_plain = None
        self.save(update_fields=['used_at', 'token_plain', 'updated_at'])
    
    @staticmethod
    def generate_token():
        """Generate a secure random token."""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def hash_token(token):
        """Hash a token using Django's password hashing."""
        return make_password(token)
    
    @staticmethod
    def verify_token(hashed_token, token):
        """Verify a token against its hash."""
        from django.contrib.auth.hashers import check_password
        return check_password(token, hashed_token)
    
    def clean(self):
        """Validate token data."""
        # Superusers should not have invite tokens (they're platform-level)
        if self.user.is_superuser:
            raise ValidationError('Superusers cannot have invite tokens.')
        
        # User must have an academy for invite tokens
        if not self.user.academy:
            raise ValidationError('User must have an academy to have an invite token.')
        
        if self.academy_id != self.user.academy_id:
            raise ValidationError('Token academy must match user academy.')
        # Allow expired tokens to be created (for testing/historical purposes)
        # Validation happens when checking is_valid()
    
    def save(self, *args, **kwargs):
        """Override save to validate."""
        self.full_clean()
        super().save(*args, **kwargs)


class PasswordResetToken(models.Model):
    """
    Secure token for password reset flow.
    Tokens are hashed before storage and expire after 1 hour.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens',
        db_index=True,
    )
    token_hash = models.CharField(
        max_length=255,
        db_index=True,
        help_text='Hashed reset token',
    )
    expires_at = models.DateTimeField(
        db_index=True,
        help_text='Token expiration timestamp',
    )
    used_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text='Timestamp when token was used (null if unused)',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tenant_password_reset_tokens'
        indexes = [
            models.Index(fields=['token_hash']),
            models.Index(fields=['user', 'used_at']),
            models.Index(fields=['expires_at', 'used_at']),
        ]
        verbose_name = 'Password Reset Token'
        verbose_name_plural = 'Password Reset Tokens'
        ordering = ['-created_at']

    def __str__(self):
        status = 'used' if self.used_at else 'active' if self.is_valid() else 'expired'
        return f"Password reset token for {self.user.email} ({status})"

    def is_valid(self):
        """Check if token is valid (not used and not expired)."""
        if self.used_at:
            return False
        return timezone.now() < self.expires_at

    def mark_as_used(self):
        """Mark token as used."""
        if self.used_at:
            raise ValidationError('Token has already been used.')
        self.used_at = timezone.now()
        self.save(update_fields=['used_at'])

    @staticmethod
    def generate_token():
        """Generate a secure random token."""
        return secrets.token_urlsafe(32)

    @staticmethod
    def hash_token(token):
        """Hash a token using Django's password hashing."""
        return make_password(token)

    @staticmethod
    def verify_token(hashed_token, token):
        """Verify a token against its hash."""
        from django.contrib.auth.hashers import check_password
        return check_password(token, hashed_token)
