"""
Serializers for user models and invite operations.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from tenant.users.models import User, AdminProfile, CoachProfile, ParentProfile, InviteToken
from tenant.students.models import Parent, Student
from tenant.students.models import Parent
from tenant.onboarding.models import Location
from tenant.coaches.models import Coach

User = get_user_model()


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
        ]
    
    def get_full_name(self, obj):
        """Get full name from first_name and last_name."""
        if obj.first_name or obj.last_name:
            return f"{obj.first_name or ''} {obj.last_name or ''}".strip()
        return None
    
    def get_status(self, obj):
        """Compute user status from is_active and is_verified."""
        if not obj.is_active:
            return 'disabled'
        elif obj.is_verified:
            return 'active'
        else:
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
        
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        return f"{frontend_url}/auth/invite/accept?token={invite_token.token_plain}"


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
        ]
    
    def update(self, instance, validated_data):
        """Update user and profile."""
        # Update user fields
        if 'first_name' in validated_data:
            instance.first_name = validated_data.get('first_name', instance.first_name)
        if 'last_name' in validated_data:
            instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        instance.save()
        
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
            'is_active',
            'last_login',
        ]
        read_only_fields = ['id', 'role', 'is_active', 'last_login']

    def validate_email(self, value):
        value = value.lower().strip()
        user = self.instance
        if User.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError(
                f"User with email {value} already exists."
            )
        return value


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


class StaffCoachNotInvitedSerializer(serializers.Serializer):
    """Minimal serializer for a staff Coach with no linked User (for coaches-for-management list)."""
    
    coach_id = serializers.IntegerField(source='id', read_only=True)
    email = serializers.EmailField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    full_name = serializers.CharField(read_only=True)
