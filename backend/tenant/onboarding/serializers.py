"""
Serializers for onboarding wizard endpoints.
"""
from rest_framework import serializers
from django.db import DatabaseError, connection
from django.utils import timezone
from django.core.validators import MinValueValidator
from saas_platform.tenants.models import Academy, OnboardingState
from tenant.onboarding.models import (
    Location, Sport, AgeCategory, Term, PricingItem, OnboardingChecklistState
)
from saas_platform.masters.models import Currency, Timezone, Country


class OnboardingStateSerializer(serializers.ModelSerializer):
    """Serializer for onboarding state."""
    
    academy_id = serializers.UUIDField(source='academy.id', read_only=True)
    steps = serializers.SerializerMethodField()
    locked = serializers.SerializerMethodField()
    locked_by = serializers.SerializerMethodField()
    
    class Meta:
        model = OnboardingState
        fields = [
            'academy_id',
            'current_step',
            'is_completed',
            'steps',
            'locked',
            'locked_by',
            'locked_at',
            'completed_at',
        ]
        read_only_fields = [
            'academy_id',
            'current_step',
            'is_completed',
            'steps',
            'locked',
            'locked_by',
            'locked_at',
            'completed_at',
        ]
    
    def get_steps(self, obj):
        """Get step-by-step progress."""
        return {
            'step_1': {
                'name': 'Academy Profile',
                'completed': obj.step_1_completed
            },
            'step_2': {
                'name': 'Branches',
                'completed': obj.step_2_completed
            },
            'step_3': {
                'name': 'Sports',
                'completed': obj.step_3_completed
            },
            'step_4': {
                'name': 'Terms',
                'completed': obj.step_4_completed
            },
            'step_5': {
                'name': 'Pricing',
                'completed': obj.step_5_completed
            },
        }
    
    def get_locked(self, obj):
        """Check if onboarding is locked."""
        return obj.is_locked()
    
    def get_locked_by(self, obj):
        """Get locked by user email if locked."""
        if obj.is_locked() and obj.locked_by:
            return obj.locked_by.email if hasattr(obj.locked_by, 'email') else str(obj.locked_by)
        return None


class AcademyProfileSerializer(serializers.ModelSerializer):
    """Serializer for academy profile (Step 1)."""
    
    class Meta:
        model = Academy
        fields = [
            'name',
            'email',
            'phone',
            'website',
            'address_line1',
            'address_line2',
            'city',
            'state',
            'postal_code',
            'country',
            'timezone',
            'currency',
        ]
    
    def validate_email(self, value):
        """Validate email format."""
        if value:
            from django.core.validators import validate_email
            from django.core.exceptions import ValidationError as DjangoValidationError
            try:
                validate_email(value)
            except DjangoValidationError:
                raise serializers.ValidationError("Enter a valid email address.")
        return value


class OnboardingChecklistStateSerializer(serializers.ModelSerializer):
    """Serializer for post-activation onboarding checklist state."""

    academy_id = serializers.UUIDField(source="academy.id", read_only=True)

    class Meta:
        model = OnboardingChecklistState
        fields = [
            "academy_id",
            "members_imported",
            "members_imported_at",
            "staff_invited",
            "staff_invited_at",
            "first_program_created",
            "first_program_created_at",
            "age_categories_configured",
            "age_categories_configured_at",
            "attendance_defaults_configured",
            "attendance_defaults_configured_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "academy_id",
            "members_imported_at",
            "staff_invited_at",
            "first_program_created_at",
            "age_categories_configured_at",
            "attendance_defaults_configured_at",
            "created_at",
            "updated_at",
        ]
    
    def validate_timezone(self, value):
        """Validate timezone identifier."""
        if not value or len(value) > 50:
            raise serializers.ValidationError("Invalid timezone identifier.")
        if not Timezone.objects.filter(code=value, is_active=True).exists():
            raise serializers.ValidationError("Unsupported timezone.")
        try:
            import pytz
            pytz.timezone(value)
        except (pytz.exceptions.UnknownTimeZoneError, ImportError):
            if '/' not in value and value != 'UTC':
                pass
        return value

    def validate_currency(self, value):
        """Validate currency code."""
        if not value or len(value) != 3:
            raise serializers.ValidationError("Currency must be a 3-letter code.")
        code = value.upper()
        if not Currency.objects.filter(code=code, is_active=True).exists():
            raise serializers.ValidationError("Unsupported currency code.")
        return code

    def validate_country(self, value):
        """Validate country against Country master when provided."""
        if not value:
            return value
        code = str(value).strip().upper()
        if len(code) != 3:
            raise serializers.ValidationError("Country must be a 3-letter ISO alpha-3 code.")
        try:
            exists = Country.objects.filter(code=code, is_active=True).exists()
        except DatabaseError:
            # Fallback to explicit public schema lookup when tenant search_path
            # context is out of sync and ORM lookups fail intermittently.
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT 1
                    FROM public.platform_countries
                    WHERE code = %s AND is_active = TRUE
                    LIMIT 1
                    """,
                    [code],
                )
                exists = cursor.fetchone() is not None
        if not exists:
            raise serializers.ValidationError("Unsupported country code.")
        return code

    def validate_address_line1(self, value):
        """Require address line 1 (non-blank)."""
        if not value or not str(value).strip():
            raise serializers.ValidationError("Address line 1 is required.")
        return value.strip()

    def validate_phone(self, value):
        """Require phone and validate syntax (digits, +, spaces, hyphens, parentheses; 8-20 chars, min 8 digits)."""
        if not value or not str(value).strip():
            raise serializers.ValidationError("Phone is required.")
        value = str(value).strip()
        if len(value) > 20:
            raise serializers.ValidationError("Phone must be 20 characters or less.")
        import re
        if not re.match(r'^[\d+\s\-()]+$', value):
            raise serializers.ValidationError(
                "Phone may only contain digits, spaces, and + - ( ). Example: +1 555 123 4567"
            )
        digit_count = sum(1 for c in value if c.isdigit())
        if digit_count < 8:
            raise serializers.ValidationError(
                "Phone must contain at least 8 digits (include country code if needed)."
            )
        return value


class LocationSerializer(serializers.ModelSerializer):
    """Serializer for location."""
    
    class Meta:
        model = Location
        fields = [
            'id',
            'academy',
            'name',
            'address_line1',
            'address_line2',
            'city',
            'state',
            'postal_code',
            'country',
            'phone',
            'capacity',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'academy', 'created_at', 'updated_at']
    
    def validate_capacity(self, value):
        """Validate capacity is positive."""
        if value is not None and value <= 0:
            raise serializers.ValidationError("Capacity must be a positive integer.")
        return value


class LocationListSerializer(serializers.ModelSerializer):
    """List serializer for location (lightweight)."""
    
    class Meta:
        model = Location
        fields = [
            'id',
            'name',
            'city',
            'state',
            'country',
            'capacity',
        ]
        read_only_fields = ['id']


class LocationBulkSerializer(serializers.Serializer):
    """Serializer for bulk location creation."""
    
    locations = LocationSerializer(many=True)
    
    def validate_locations(self, value):
        """Validate at least one location and no duplicate names."""
        if not value or len(value) == 0:
            raise serializers.ValidationError("At least one location is required.")
        
        names = [loc.get('name') for loc in value if loc.get('name')]
        if len(names) != len(set(names)):
            raise serializers.ValidationError("Duplicate location names are not allowed.")
        
        return value


class SportSerializer(serializers.ModelSerializer):
    """Serializer for sport."""
    
    class Meta:
        model = Sport
        fields = [
            'id',
            'academy',
            'name',
            'description',
            'age_min',
            'age_max',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'academy', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate age range."""
        age_min = data.get('age_min')
        age_max = data.get('age_max')
        
        if age_min is not None and age_max is not None:
            if age_max <= age_min:
                raise serializers.ValidationError({
                    'age_max': 'Age max must be greater than age min.'
                })
        
        return data


class SportListSerializer(serializers.ModelSerializer):
    """List serializer for sport (lightweight)."""
    
    class Meta:
        model = Sport
        fields = [
            'id',
            'name',
            'age_min',
            'age_max',
        ]
        read_only_fields = ['id']


class SportBulkSerializer(serializers.Serializer):
    """Serializer for bulk sport creation."""
    
    sports = SportSerializer(many=True)
    
    def validate_sports(self, value):
        """Validate at least one sport and no duplicate names."""
        if not value or len(value) == 0:
            raise serializers.ValidationError("At least one sport is required.")
        
        names = [sport.get('name') for sport in value if sport.get('name')]
        if len(names) != len(set(names)):
            raise serializers.ValidationError("Duplicate sport names are not allowed.")
        
        return value


class AgeCategorySerializer(serializers.ModelSerializer):
    """Serializer for age category."""
    
    class Meta:
        model = AgeCategory
        fields = [
            'id',
            'academy',
            'name',
            'age_min',
            'age_max',
            'description',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'academy', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate age range."""
        age_min = data.get('age_min')
        age_max = data.get('age_max')
        
        if age_max <= age_min:
            raise serializers.ValidationError({
                'age_max': 'Age max must be greater than age min.'
            })
        
        return data


class AgeCategoryListSerializer(serializers.ModelSerializer):
    """List serializer for age category (lightweight)."""
    
    class Meta:
        model = AgeCategory
        fields = [
            'id',
            'name',
            'age_min',
            'age_max',
        ]
        read_only_fields = ['id']


class AgeCategoryBulkSerializer(serializers.Serializer):
    """Serializer for bulk age category creation."""
    
    age_categories = AgeCategorySerializer(many=True)
    
    def validate_age_categories(self, value):
        """Validate at least one age category and no duplicate names."""
        if not value or len(value) == 0:
            raise serializers.ValidationError("At least one age category is required.")
        
        names = [cat.get('name') for cat in value if cat.get('name')]
        if len(names) != len(set(names)):
            raise serializers.ValidationError("Duplicate age category names are not allowed.")
        
        return value


class TermSerializer(serializers.ModelSerializer):
    """Serializer for term."""
    
    class Meta:
        model = Term
        fields = [
            'id',
            'academy',
            'name',
            'start_date',
            'end_date',
            'description',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'academy', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate date range."""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if end_date <= start_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date.'
            })
        
        return data


class TermListSerializer(serializers.ModelSerializer):
    """List serializer for term (lightweight)."""
    
    class Meta:
        model = Term
        fields = [
            'id',
            'name',
            'start_date',
            'end_date',
        ]
        read_only_fields = ['id']


class TermBulkSerializer(serializers.Serializer):
    """Serializer for bulk term creation."""
    
    terms = TermSerializer(many=True)
    
    def validate_terms(self, value):
        """Validate at least one term and no duplicate name+start_date combinations."""
        if not value or len(value) == 0:
            raise serializers.ValidationError("At least one term is required.")
        
        combinations = [
            (term.get('name'), term.get('start_date'))
            for term in value
            if term.get('name') and term.get('start_date')
        ]
        if len(combinations) != len(set(combinations)):
            raise serializers.ValidationError(
                "Duplicate term name and start_date combinations are not allowed."
            )
        
        return value


class PricingItemSerializer(serializers.ModelSerializer):
    """Serializer for pricing item."""
    
    # Currency should be optional in the request; it will be derived from academy.profile.
    currency = serializers.CharField(required=False)
    
    class Meta:
        model = PricingItem
        fields = [
            'name',
            'description',
            'duration_type',
            'duration_value',
            'price',
            'currency',
        ]
        extra_kwargs = {
            # Currency is derived from the academy profile on the server.
            'currency': {'required': False},
        }

    
    def validate_duration_type(self, value):
        """Validate duration type."""
        valid_types = [choice[0] for choice in PricingItem.DurationType.choices]
        if value not in valid_types:
            raise serializers.ValidationError(
                f"Invalid duration type. Must be one of: {', '.join(valid_types)}."
            )
        return value
    
    def validate_price(self, value):
        """Validate price is non-negative."""
        if value < 0:
            raise serializers.ValidationError("Price must be a positive number.")
        return value


class PricingItemBulkSerializer(serializers.Serializer):
    """Serializer for bulk pricing item creation."""
    
    pricing_items = PricingItemSerializer(many=True)
    
    def validate_pricing_items(self, value):
        """Validate at least one pricing item and no duplicate name+duration_type combinations."""
        if not value or len(value) == 0:
            raise serializers.ValidationError("At least one pricing item is required.")
        
        combinations = [
            (item.get('name'), item.get('duration_type'))
            for item in value
            if item.get('name') and item.get('duration_type')
        ]
        if len(combinations) != len(set(combinations)):
            raise serializers.ValidationError(
                "Duplicate pricing item name and duration_type combinations are not allowed."
            )
        
        return value
