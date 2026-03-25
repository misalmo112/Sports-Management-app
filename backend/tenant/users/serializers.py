"""
Serializers for user models and invite operations.
"""
import logging
from rest_framework import serializers
from django.contrib.auth import get_user_model
from urllib.parse import quote

from django.conf import settings
from django.db import transaction
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from tenant.users.models import User, AdminProfile, CoachProfile, ParentProfile, InviteToken
from tenant.students.models import Parent, Student
from tenant.onboarding.models import Location
from tenant.coaches.models import Coach
from shared.permissions.module_keys import validate_allowed_modules_for_staff
from shared.tenancy.schema import public_schema_context
from saas_platform.audit.services import AuditService
from saas_platform.audit.models import AuditAction, ResourceType
from tenant.users.services import (
    actor_bypasses_last_admin_guard,
    count_elevated_tenant_admins,
)

User = get_user_model()
logger = logging.getLogger(__name__)


class AdminProfileSerializer(serializers.ModelSerializer):
    """Serializer for AdminProfile."""
    
    class Meta:
        model = AdminProfile
        fields = ['is_active']
        read_only_fields = ['user', 'academy']


class CoachProfileSerializer(serializers.ModelSerializer):
    """Serializer for CoachProfile."""
    
    location_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    location = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = CoachProfile
        fields = ['type', 'location_id', 'location', 'is_active']
        read_only_fields = ['user', 'academy', 'location']
    
    def validate_location_id(self, value):
        """Validate location belongs to academy."""
        if value:
            request = self.context.get('request')
            if request and hasattr(request, 'academy') and request.academy:
                try:
                    location = Location.objects.get(id=value, academy=request.academy)
                    return value
                except Location.DoesNotExist:
                    raise serializers.ValidationError(
                        "Location not found or does not belong to this academy."
                    )
        return value


class ParentProfileSerializer(serializers.ModelSerializer):
    """Serializer for ParentProfile."""
    
    class Meta:
        model = ParentProfile
        fields = ['phone', 'is_active']
        read_only_fields = ['user', 'academy']


class ParentSelfServiceProfileSerializer(serializers.ModelSerializer):
    """Parent self-service: phone only (no is_active changes)."""

    class Meta:
        model = ParentProfile
        fields = ['phone']


class ParentRecordSerializer(serializers.ModelSerializer):
    """Serializer for Parent model details tied to a user."""
    
    class Meta:
        model = Parent
        fields = [
            'id',
            'first_name',
            'last_name',
            'email',
            'phone',
            'phone_numbers',
            'address_line1',
            'address_line2',
            'city',
            'state',
            'postal_code',
            'country',
            'is_active',
        ]
        read_only_fields = ['id', 'email', 'is_active']


class ParentRecordUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating Parent model details via user update."""
    
    class Meta:
        model = Parent
        fields = [
            'phone',
            'phone_numbers',
            'address_line1',
            'address_line2',
            'city',
            'state',
            'postal_code',
            'country',
        ]


class ParentStudentSerializer(serializers.ModelSerializer):
    """Serializer for listing students linked to a parent."""
    
    full_name = serializers.CharField(read_only=True)
    age = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Student
        fields = [
            'id',
            'full_name',
            'date_of_birth',
            'age',
            'gender',
            'is_active',
        ]


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    admin_profile = AdminProfileSerializer(read_only=True)
    coach_profile = CoachProfileSerializer(read_only=True)
    parent_profile = ParentProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    parent_record = serializers.SerializerMethodField()
    parent_students = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'role',
            'role_display',
            'academy',
            'is_active',
            'is_verified',
            'admin_profile',
            'coach_profile',
            'parent_profile',
            'parent_record',
            'parent_students',
            'allowed_modules',
            'created_at',
            'updated_at',
            'last_login',
        ]
        read_only_fields = [
            'id',
            'email',
            'role',
            'academy',
            'is_verified',
            'allowed_modules',
            'created_at',
            'updated_at',
            'last_login',
        ]
    
    def get_full_name(self, obj):
        """Get full name from first_name and last_name."""
        if obj.first_name or obj.last_name:
            return f"{obj.first_name or ''} {obj.last_name or ''}".strip()
        return None

    def _get_parent_record(self, obj):
        if obj.role != User.Role.PARENT or not obj.academy_id:
            return None
        return Parent.objects.filter(
            academy_id=obj.academy_id,
            email=obj.email
        ).first()

    def get_parent_record(self, obj):
        """Get parent details tied to this user."""
        parent = self._get_parent_record(obj)
        if not parent:
            return None
        return ParentRecordSerializer(parent).data

    def get_parent_students(self, obj):
        """Get students linked to the parent's record."""
        parent = self._get_parent_record(obj)
        if not parent:
            return []
        students = Student.objects.filter(parent=parent).order_by('last_name', 'first_name')
        return ParentStudentSerializer(students, many=True).data
    
    def validate(self, data):
        """Validate academy requirement for non-superusers."""
        # Get is_superuser from data or instance
        is_superuser = data.get('is_superuser', getattr(self.instance, 'is_superuser', False) if self.instance else False)
        # Get academy from data or instance
        academy = data.get('academy', getattr(self.instance, 'academy', None) if self.instance else None)
        
        # Non-superusers must have an academy
        if not is_superuser and not academy:
            raise serializers.ValidationError({
                'academy': 'Academy is required for non-superuser users.'
            })
        
        return data


class UserListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for User list views."""
    
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    status = serializers.SerializerMethodField()
    invited_at = serializers.SerializerMethodField()
    invite_status = serializers.SerializerMethodField()
    invite_created_at = serializers.SerializerMethodField()
    invite_expires_at = serializers.SerializerMethodField()
    invite_accepted_at = serializers.SerializerMethodField()
    has_active_invite = serializers.SerializerMethodField()
    invite_link = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'role',
            'role_display',
            'is_active',
            'is_verified',
            'status',
            'created_at',
            'invited_at',
            'invite_status',
            'invite_created_at',
            'invite_expires_at',
            'invite_accepted_at',
            'has_active_invite',
            'invite_link',
            'allowed_modules',
        ]
    
    def get_full_name(self, obj):
        """Get full name from first_name and last_name."""
        if obj.first_name or obj.last_name:
            return f"{obj.first_name or ''} {obj.last_name or ''}".strip()
        return None
    
    def get_status(self, obj):
        """
        Compute user status from is_active and is_verified.

        Invited users are created inactive (is_active=False) until they accept;
        they must show as 'invited', not 'disabled'. 'disabled' is for accounts
        that were verified then deactivated (e.g. soft-delete).
        """
        if obj.is_active and obj.is_verified:
            return 'active'
        if obj.is_active and not obj.is_verified:
            return 'invited'
        if not obj.is_active and obj.is_verified:
            return 'disabled'
        return 'invited'
    
    def _get_most_recent_invite_token(self, user):
        """Get the most recent invite token for a user."""
        # Django will use prefetched data automatically when available
        invite_tokens = list(user.invite_tokens.all())
        
        if not invite_tokens:
            return None
        
        # Get the most recent token (ordered by created_at DESC)
        return max(invite_tokens, key=lambda t: t.created_at)
    
    def _get_most_recent_accepted_invite_token(self, user):
        """Get the most recent accepted (used) invite token for a user."""
        # Django will use prefetched data automatically when available
        invite_tokens = list(user.invite_tokens.all())
        
        # Filter for used tokens
        used_tokens = [t for t in invite_tokens if t.used_at is not None]
        
        if not used_tokens:
            return None
        
        # Get the most recent one by used_at
        return max(used_tokens, key=lambda t: t.used_at)
    
    def get_invite_status(self, obj):
        """Get invite status: 'accepted', 'pending', 'expired', or 'none'."""
        invite_token = self._get_most_recent_invite_token(obj)
        
        if not invite_token:
            return 'none'
        
        if invite_token.used_at:
            return 'accepted'
        
        if timezone.now() >= invite_token.expires_at:
            return 'expired'
        
        return 'pending'
    
    def get_invite_created_at(self, obj):
        """Get creation date of most recent invite token."""
        invite_token = self._get_most_recent_invite_token(obj)
        if invite_token:
            return invite_token.created_at
        return None
    
    def get_invite_expires_at(self, obj):
        """Get expiration date of most recent invite token."""
        invite_token = self._get_most_recent_invite_token(obj)
        if invite_token:
            return invite_token.expires_at
        return None
    
    def get_invite_accepted_at(self, obj):
        """Get acceptance date (used_at) of most recent accepted invite token."""
        invite_token = self._get_most_recent_accepted_invite_token(obj)
        if invite_token:
            return invite_token.used_at
        return None
    
    def get_has_active_invite(self, obj):
        """Check if user has an active (unused, not expired) invite."""
        invite_token = self._get_most_recent_invite_token(obj)
        if not invite_token:
            return False
        
        # Active means: not used and not expired
        if invite_token.used_at:
            return False
        
        return timezone.now() < invite_token.expires_at
    
    def get_invited_at(self, obj):
        """Get invite creation date (alias for invite_created_at for backward compatibility)."""
        return self.get_invite_created_at(obj)
    
    def get_invite_link(self, obj):
        """Build invite link for active pending invites."""
        invite_token = self._get_most_recent_invite_token(obj)
        if not invite_token:
            return None
        
        if invite_token.used_at:
            return None
        
        if timezone.now() >= invite_token.expires_at:
            return None
        
        if not invite_token.token_plain:
            return None
        
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
        q = quote(invite_token.token_plain, safe='')
        return f"{frontend_url}/accept-invite?token={q}"


class CreateStaffUserSerializer(serializers.Serializer):
    """Serializer for creating STAFF users with module grants."""

    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(
        required=False, allow_blank=True, default='', max_length=150
    )
    last_name = serializers.CharField(
        required=False, allow_blank=True, default='', max_length=150
    )
    allowed_modules = serializers.ListField(
        child=serializers.CharField(),
        required=True,
        allow_empty=False,
    )

    def validate_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(f"User with email {value} already exists.")
        return value

    def validate_allowed_modules(self, value):
        validate_allowed_modules_for_staff(list(value))
        return list(value)


class CreateAdminUserSerializer(serializers.Serializer):
    """Serializer for creating ADMIN users."""
    
    email = serializers.EmailField(required=True)
    profile = AdminProfileSerializer(required=False, default=dict)
    
    def validate_email(self, value):
        """Validate email is unique."""
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                f"User with email {value} already exists."
            )
        return value


class CreateCoachProfileSerializer(serializers.Serializer):
    """Serializer for coach profile data during creation."""
    
    type = serializers.CharField(required=False, allow_blank=True)
    location_id = serializers.IntegerField(required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False, default=True)
    
    def validate_location_id(self, value):
        """Validate location belongs to academy."""
        if value:
            request = self.context.get('request')
            if request and hasattr(request, 'academy') and request.academy:
                try:
                    Location.objects.get(id=value, academy=request.academy)
                    return value
                except Location.DoesNotExist:
                    raise serializers.ValidationError(
                        "Location not found or does not belong to this academy."
                    )
        return value


class CreateCoachUserSerializer(serializers.Serializer):
    """Serializer for creating COACH users."""
    
    email = serializers.EmailField(required=True)
    profile = CreateCoachProfileSerializer(required=False, default=dict)
    
    def validate_email(self, value):
        """Validate email is unique."""
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                f"User with email {value} already exists."
            )
        return value


class CreateParentUserSerializer(serializers.Serializer):
    """Serializer for creating PARENT users."""
    
    email = serializers.EmailField(required=True)
    profile = ParentProfileSerializer(required=False, default=dict)
    
    def validate_email(self, value):
        """Validate email is unique."""
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                f"User with email {value} already exists."
            )
        return value


class UpdateUserSerializer(serializers.ModelSerializer):
    """Serializer for updating user and profile."""
    
    admin_profile = AdminProfileSerializer(required=False)
    coach_profile = CoachProfileSerializer(required=False)
    parent_profile = ParentProfileSerializer(required=False)
    parent_record = ParentRecordUpdateSerializer(required=False)
    allowed_modules = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_null=True,
    )
    
    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
            'is_active',
            'admin_profile',
            'coach_profile',
            'parent_profile',
            'parent_record',
            'allowed_modules',
        ]

    def validate(self, attrs):
        request = self.context.get('request')
        actor = getattr(request, 'user', None) if request else None
        actor_role = getattr(actor, 'role', None)
        if 'allowed_modules' in attrs and attrs['allowed_modules'] is not None:
            if self.instance.role != User.Role.STAFF:
                raise serializers.ValidationError(
                    {'allowed_modules': 'allowed_modules can only be set for STAFF users.'}
                )
            if actor_role not in ('OWNER', 'ADMIN'):
                raise serializers.ValidationError(
                    {'allowed_modules': 'Only OWNER or ADMIN can change module access.'}
                )
            validate_allowed_modules_for_staff(attrs['allowed_modules'])
        if 'is_active' in attrs and attrs['is_active'] is False:
            inst = self.instance
            if (
                inst
                and inst.academy_id
                and inst.role in (User.Role.OWNER, User.Role.ADMIN)
                and inst.is_active
                and inst.is_verified
                and not actor_bypasses_last_admin_guard(actor)
            ):
                if count_elevated_tenant_admins(inst.academy_id, exclude_user_id=inst.pk) == 0:
                    raise serializers.ValidationError(
                        {
                            'is_active': (
                                'Cannot deactivate the last active Owner or Admin for this academy.'
                            )
                        }
                    )
        return attrs
    
    def update(self, instance, validated_data):
        """Update user and profile."""
        had_allowed_modules_update = 'allowed_modules' in validated_data
        old_staff_modules = None
        if instance.role == User.Role.STAFF:
            old_staff_modules = (
                None
                if instance.allowed_modules is None
                else list(instance.allowed_modules)
            )
        # Update user fields
        if 'first_name' in validated_data:
            instance.first_name = validated_data.get('first_name', instance.first_name)
        if 'last_name' in validated_data:
            instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        if 'allowed_modules' in validated_data:
            instance.allowed_modules = validated_data.pop('allowed_modules')
        instance.save()
        if had_allowed_modules_update and instance.role == User.Role.STAFF:
            new_modules = (
                list(instance.allowed_modules)
                if instance.allowed_modules is not None
                else []
            )
            if sorted(old_staff_modules or []) != sorted(new_modules):
                request = self.context.get('request')
                academy = getattr(request, 'academy', None) if request else None
                if academy:
                    try:
                        with public_schema_context():
                            AuditService.log_action(
                                user=None,
                                action=AuditAction.UPDATE,
                                resource_type=ResourceType.USER,
                                resource_id=str(instance.pk),
                                academy=academy,
                                changes_json={
                                    'field': 'allowed_modules',
                                    'target_user_id': instance.pk,
                                    'actor_id': getattr(request.user, 'pk', None),
                                    'actor_email': getattr(
                                        request.user, 'email', None
                                    ),
                                    'before': old_staff_modules,
                                    'after': new_modules,
                                },
                                request=request,
                            )
                    except Exception:
                        logger.exception(
                            'Failed to write audit log for allowed_modules change'
                        )
        
        if instance.role == User.Role.PARENT and instance.academy_id:
            parent_updates = {}
            if 'first_name' in validated_data:
                parent_updates['first_name'] = instance.first_name
            if 'last_name' in validated_data:
                parent_updates['last_name'] = instance.last_name
            if parent_updates:
                Parent.objects.filter(
                    academy_id=instance.academy_id,
                    email=instance.email
                ).update(**parent_updates)
        
        parent_record_data = validated_data.get('parent_record')
        if instance.role == User.Role.PARENT and parent_record_data:
            Parent.objects.filter(
                academy_id=instance.academy_id,
                email=instance.email
            ).update(**parent_record_data)
        
        # Update profile based on role
        if instance.role == User.Role.ADMIN and 'admin_profile' in validated_data:
            profile_data = validated_data.pop('admin_profile')
            if hasattr(instance, 'admin_profile'):
                for key, value in profile_data.items():
                    setattr(instance.admin_profile, key, value)
                instance.admin_profile.save()
        
        elif instance.role == User.Role.COACH and 'coach_profile' in validated_data:
            profile_data = validated_data.pop('coach_profile')
            if hasattr(instance, 'coach_profile'):
                # Handle location_id if provided
                if 'location_id' in profile_data:
                    location_id = profile_data.pop('location_id')
                    if location_id:
                        try:
                            location = Location.objects.get(
                                id=location_id,
                                academy=instance.academy
                            )
                            profile_data['location'] = location
                        except Location.DoesNotExist:
                            pass
                
                for key, value in profile_data.items():
                    setattr(instance.coach_profile, key, value)
                instance.coach_profile.save()
        
        elif instance.role == User.Role.PARENT and 'parent_profile' in validated_data:
            profile_data = validated_data.pop('parent_profile')
            if hasattr(instance, 'parent_profile'):
                for key, value in profile_data.items():
                    setattr(instance.parent_profile, key, value)
                instance.parent_profile.save()
        
        return instance


class LoginSerializer(serializers.Serializer):
    """Serializer for login authentication."""
    
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )


class CurrentAccountSerializer(serializers.ModelSerializer):
    """Serializer for the authenticated user's account settings."""

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'role',
            'allowed_modules',
            'is_active',
            'last_login',
        ]
        read_only_fields = ['id', 'role', 'allowed_modules', 'is_active', 'last_login']

    def validate_email(self, value):
        value = value.lower().strip()
        user = self.instance
        if User.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError(
                f"User with email {value} already exists."
            )
        return value


class ParentCurrentAccountSerializer(CurrentAccountSerializer):
    """
    Self-service account for PARENT: same user fields as CurrentAccountSerializer plus
    parent_profile (phone), parent_record (address / guardian phones), read in GET and
    validated from initial_data on PATCH.
    """

    class Meta(CurrentAccountSerializer.Meta):
        pass

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        academy = getattr(request, 'academy', None) if request else None

        try:
            data['parent_profile'] = ParentSelfServiceProfileSerializer(
                instance.parent_profile
            ).data
        except ParentProfile.DoesNotExist:
            data['parent_profile'] = {'phone': ''}

        if academy:
            parent_row = (
                Parent.objects.filter(
                    academy_id=academy.id,
                    email__iexact=instance.email,
                )
                .first()
            )
            data['parent_record'] = (
                ParentRecordSerializer(parent_row).data if parent_row else None
            )
        else:
            data['parent_record'] = None

        return data

    def validate_email(self, value):
        value = value.lower().strip()
        user = self.instance
        if User.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError(
                f"User with email {value} already exists."
            )
        request = self.context.get('request')
        academy = getattr(request, 'academy', None) if request else None
        if (
            academy
            and getattr(user, 'role', None) == User.Role.PARENT
            and Parent.objects.filter(academy_id=academy.id, email__iexact=value)
            .exclude(email__iexact=user.email)
            .exists()
        ):
            raise serializers.ValidationError(
                'Another guardian already uses this email in this academy.'
            )
        return value

    def update(self, instance, validated_data):
        request = self.context.get('request')
        academy = getattr(request, 'academy', None) if request else None

        parent_profile_touched = False
        parent_profile_payload = None
        parent_record_touched = False
        parent_record_payload = None
        initial = getattr(self, 'initial_data', None) or {}
        if 'parent_profile' in initial:
            parent_profile_touched = True
            sub = ParentSelfServiceProfileSerializer(
                data=initial.get('parent_profile') or {},
                partial=True,
            )
            sub.is_valid(raise_exception=True)
            parent_profile_payload = sub.validated_data
        if 'parent_record' in initial:
            parent_record_touched = True
            sub = ParentRecordUpdateSerializer(
                data=initial.get('parent_record') or {},
                partial=True,
            )
            sub.is_valid(raise_exception=True)
            parent_record_payload = sub.validated_data

        old_email = (instance.email or '').lower().strip()

        with transaction.atomic():
            instance = super().update(instance, validated_data)
            new_email = (instance.email or '').lower().strip()

            if academy and getattr(instance, 'role', None) == User.Role.PARENT:
                parent_row = (
                    Parent.objects.select_for_update()
                    .filter(academy_id=academy.id, email__iexact=old_email)
                    .first()
                )
                if parent_row:
                    row_dirty = False
                    if instance.first_name != parent_row.first_name:
                        parent_row.first_name = instance.first_name
                        row_dirty = True
                    if instance.last_name != parent_row.last_name:
                        parent_row.last_name = instance.last_name
                        row_dirty = True
                    if old_email != new_email:
                        parent_row.email = new_email
                        row_dirty = True
                    if parent_record_touched and parent_record_payload is not None:
                        for key, val in parent_record_payload.items():
                            setattr(parent_row, key, val)
                        row_dirty = True
                    if row_dirty:
                        parent_row.save()

            if parent_profile_touched and academy:
                try:
                    prof = instance.parent_profile
                    if parent_profile_payload:
                        for key, val in parent_profile_payload.items():
                            setattr(prof, key, val)
                        prof.save(
                            update_fields=[
                                *list(parent_profile_payload.keys()),
                                'updated_at',
                            ]
                        )
                except ParentProfile.DoesNotExist:
                    ParentProfile.objects.create(
                        user=instance,
                        academy=academy,
                        phone=(parent_profile_payload or {}).get('phone', '') or '',
                    )

        return instance


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for authenticated password changes."""

    current_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
    )
    new_password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
    )

    def validate(self, attrs):
        user = self.context['request'].user
        current_password = attrs['current_password']
        new_password = attrs['new_password']
        new_password_confirm = attrs['new_password_confirm']

        if not user.check_password(current_password):
            raise serializers.ValidationError({
                'current_password': 'Current password is incorrect.'
            })

        if new_password != new_password_confirm:
            raise serializers.ValidationError({
                'new_password_confirm': 'Passwords do not match.'
            })

        if current_password == new_password:
            raise serializers.ValidationError({
                'new_password': 'New password must be different from the current password.'
            })

        validate_password(new_password, user=user)
        return attrs


class AcceptInviteSerializer(serializers.Serializer):
    """Serializer for accepting invite."""
    
    token = serializers.CharField(required=True, write_only=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        min_length=8,
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        """Validate password confirmation matches."""
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm')
        
        if password != password_confirm:
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match.'
            })
        
        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    """Serializer for forgot password request."""
    email = serializers.EmailField(required=True)


class ResetPasswordSerializer(serializers.Serializer):
    """Serializer for resetting password with token."""
    token = serializers.CharField(required=True, write_only=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        min_length=8,
        style={'input_type': 'password'},
    )
    password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
    )

    def validate(self, attrs):
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm')
        if password != password_confirm:
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match.',
            })
        # Optional: run Django password validation (no user context for reset)
        validate_password(password)
        return attrs


class StaffCoachNotInvitedSerializer(serializers.Serializer):
    """Minimal serializer for a staff Coach with no linked User (for coaches-for-management list)."""
    
    coach_id = serializers.IntegerField(source='id', read_only=True)
    email = serializers.EmailField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    full_name = serializers.CharField(read_only=True)


class GuardianParentNotInvitedSerializer(serializers.Serializer):
    """Minimal serializer for a Parent (guardian) with no linked PARENT User (parents-for-management list)."""

    parent_id = serializers.IntegerField(source='id', read_only=True)
    email = serializers.EmailField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    full_name = serializers.CharField(read_only=True)
