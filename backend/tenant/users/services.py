"""
User service for user creation, invite management, and authentication.

This service handles:
- User creation with profiles
- Invite token generation and validation
- Invite acceptance and password setting
- Quota checking before user creation
"""
import secrets
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import ValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError
from shared.services.quota import check_quota_before_create, QuotaExceededError
from tenant.users.models import User, AdminProfile, CoachProfile, ParentProfile, InviteToken
from tenant.coaches.models import Coach

# Optional Celery import
try:
    from celery_app.tasks import send_invite_email
except ImportError:
    send_invite_email = None


class UserService:
    """Service for user management operations."""
    
    @staticmethod
    @transaction.atomic
    def create_user_with_invite(role, email, academy, created_by, profile_data=None, first_name=None, last_name=None):
        """
        Create a user with profile and generate invite token.
        
        Args:
            role: User.Role enum value (ADMIN, COACH, or PARENT)
            email: User email address (must be unique)
            academy: Academy instance
            created_by: User who is creating this user
            profile_data: Dict with profile-specific data
            first_name: Optional first name for the user
            last_name: Optional last name for the user
        
        Returns:
            tuple: (user, invite_token_string)
        
        Raises:
            ValidationError: If validation fails
            QuotaExceededError: If quota would be exceeded
        """
        profile_data = profile_data or {}
        
        # Validate role
        if role not in [User.Role.ADMIN, User.Role.COACH, User.Role.PARENT]:
            raise ValidationError(f"Invalid role: {role}. Must be ADMIN, COACH, or PARENT.")
        
        # Check quota before creating
        if role == User.Role.ADMIN:
            check_quota_before_create(academy, 'admins', requested_increment=1)
        elif role == User.Role.COACH:
            check_quota_before_create(academy, 'coaches', requested_increment=1)
        # PARENT users don't have quota limits
        
        # Normalize email
        email = email.lower().strip()
        
        # Check email uniqueness
        if User.objects.filter(email=email).exists():
            raise ValidationError(f"User with email {email} already exists.")
        
        # Create user (inactive until invite is accepted)
        user_kwargs = {
            'email': email,
            'role': role,
            'academy': academy,
            'is_active': False,  # Inactive until invite accepted
            'is_verified': False,  # Not verified until invite accepted
            'password': None,  # No password until invite accepted
        }
        # Only add first_name and last_name if provided
        if first_name is not None:
            user_kwargs['first_name'] = first_name
        if last_name is not None:
            user_kwargs['last_name'] = last_name
        
        user = User.objects.create_user(**user_kwargs)
        
        # Create profile based on role
        if role == User.Role.ADMIN:
            AdminProfile.objects.create(
                user=user,
                academy=academy,
                **{k: v for k, v in profile_data.items() if k in ['is_active']}
            )
        elif role == User.Role.COACH:
            location_id = profile_data.get('location_id')
            # Convert string to int if needed (Location uses AutoField)
            if location_id and isinstance(location_id, str):
                try:
                    location_id = int(location_id)
                except (ValueError, TypeError):
                    location_id = None
            CoachProfile.objects.create(
                user=user,
                academy=academy,
                type=profile_data.get('type', ''),
                location_id=location_id,
                **{k: v for k, v in profile_data.items() if k in ['is_active']}
            )
        elif role == User.Role.PARENT:
            ParentProfile.objects.create(
                user=user,
                academy=academy,
                phone=profile_data.get('phone', ''),
                **{k: v for k, v in profile_data.items() if k in ['is_active']}
            )
        
        # Generate invite token
        invite_token_string = UserService.generate_invite_token(user, created_by)
        
        return user, invite_token_string
    
    @staticmethod
    @transaction.atomic
    def create_user_with_invite_for_staff_coach(coach, academy, created_by):
        """
        Create a User (role=COACH) and CoachProfile for an existing staff Coach,
        link coach.user to the new user, generate invite token. Does not send email.
        
        Args:
            coach: tenant.coaches.models.Coach instance with user=None
            academy: Academy instance (must match coach.academy)
            created_by: User who is creating the invite
        
        Returns:
            tuple: (user, invite_token_string)
        
        Raises:
            ValidationError: If coach already has user or email already exists
            QuotaExceededError: If coach quota would be exceeded
        """
        if coach.user_id is not None:
            raise ValidationError("This coach already has a user account linked.")
        if coach.academy_id != academy.id:
            raise ValidationError("Coach does not belong to this academy.")
        
        check_quota_before_create(academy, 'coaches', requested_increment=1)
        
        email = coach.email.lower().strip()
        if User.objects.filter(email=email).exists():
            raise ValidationError(f"User with email {email} already exists.")
        
        user = User.objects.create_user(
            email=email,
            role=User.Role.COACH,
            academy=academy,
            is_active=False,
            is_verified=False,
            password=None,
            first_name=coach.first_name or '',
            last_name=coach.last_name or '',
        )
        CoachProfile.objects.create(
            user=user,
            academy=academy,
            type='',
            location_id=None,
            is_active=True,
        )
        coach.user = user
        coach.save(update_fields=['user', 'updated_at'])
        
        token = UserService.generate_invite_token(user, created_by)
        return user, token
    
    @staticmethod
    @transaction.atomic
    def generate_invite_token(user, created_by=None):
        """
        Generate a new invite token for a user.
        
        This method:
        1. Invalidates any existing active tokens for the user
        2. Generates a new secure token
        3. Hashes and stores the token
        4. Sets expiration time
        
        Args:
            user: User instance
            created_by: User who created the invite (optional)
        
        Returns:
            str: Plain text token (to be sent via email)
        """
        # Invalidate existing active tokens for this user
        InviteToken.objects.filter(
            user=user,
            used_at__isnull=True,
            expires_at__gt=timezone.now()
        ).update(used_at=timezone.now(), token_plain=None)
        
        # Generate secure token
        token = InviteToken.generate_token()
        token_hash = InviteToken.hash_token(token)
        
        # Calculate expiration (default 48 hours, configurable)
        expiration_hours = getattr(settings, 'INVITE_TOKEN_EXPIRATION_HOURS', 48)
        expires_at = timezone.now() + timezone.timedelta(hours=expiration_hours)
        
        # Create invite token
        invite_token = InviteToken.objects.create(
            user=user,
            academy=user.academy,
            token_hash=token_hash,
            token_plain=token,
            expires_at=expires_at,
            created_by=created_by
        )
        
        return token
    
    @staticmethod
    @transaction.atomic
    def accept_invite(token, password):
        """
        Accept an invite by validating token and setting password.
        
        Args:
            token: Plain text invite token
            password: User's chosen password
        
        Returns:
            User: Activated user instance
        
        Raises:
            ValidationError: If token is invalid, expired, or already used
        """
        # Find token by checking all active tokens
        # We need to check each token's hash
        active_tokens = InviteToken.objects.filter(
            used_at__isnull=True,
            expires_at__gt=timezone.now()
        ).select_related('user', 'academy')
        
        invite_token = None
        for candidate in active_tokens:
            if InviteToken.verify_token(candidate.token_hash, token):
                invite_token = candidate
                break
        
        if not invite_token:
            raise ValidationError("Invalid or expired invite token.")
        
        # Mark token as used
        invite_token.mark_as_used()
        
        # Set password and activate user
        user = invite_token.user
        user.set_password(password)
        user.is_active = True
        user.is_verified = True
        user.save(update_fields=['password', 'is_active', 'is_verified', 'updated_at'])
        
        return user
    
    @staticmethod
    @transaction.atomic
    def resend_invite(user, created_by=None):
        """
        Resend invite by generating a new token.
        
        This invalidates the old token and creates a new one.
        
        Args:
            user: User instance
            created_by: User who is resending the invite (optional)
        
        Returns:
            str: Plain text token (to be sent via email)
        """
        if user.is_active and user.is_verified:
            raise ValidationError("User is already active. Cannot resend invite.")
        
        return UserService.generate_invite_token(user, created_by)
    
    @staticmethod
    def send_invite_email_async(user, token):
        """
        Trigger async email sending via Celery.
        
        Args:
            user: User instance
            token: Plain text invite token
        """
        if send_invite_email:
            send_invite_email.delay(user.id, token)
        else:
            # Fallback: send synchronously if Celery not available
            from django.core.mail import send_mail
            from django.conf import settings
            
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            invite_url = f"{frontend_url}/auth/invite/accept?token={token}"
            expiration_hours = getattr(settings, 'INVITE_TOKEN_EXPIRATION_HOURS', 48)
            
            send_mail(
                subject=f"Invitation to join {user.academy.name}",
                message=f"Hello,\n\nYou have been invited to join {user.academy.name} as a {user.get_role_display()}.\n\nTo accept this invitation and set your password, please click the link below:\n{invite_url}\n\nThis invitation will expire in {expiration_hours} hours.\n\nBest regards,\n{user.academy.name} Team",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
