from rest_framework import serializers
from django.db.models import Sum
from saas_platform.tenants.models import Academy
from saas_platform.masters.models import Country, Currency, Timezone
from django.contrib.auth import get_user_model
from shared.tenancy.schema import schema_context
from django.db import connection
from saas_platform.subscriptions.serializers import SubscriptionSerializer
from saas_platform.quotas.serializers import TenantQuotaSerializer


class AcademySerializer(serializers.ModelSerializer):
    """Full academy representation."""
    current_subscription = serializers.SerializerMethodField()
    quota = serializers.SerializerMethodField()
    usage = serializers.SerializerMethodField()
    
    class Meta:
        model = Academy
        fields = [
            'id', 'name', 'slug', 'email', 'phone', 'website',
            'address_line1', 'address_line2', 'city', 'state',
            'postal_code', 'country', 'timezone', 'currency',
            'onboarding_completed', 'is_active',
            'created_at', 'updated_at',
            'current_subscription', 'quota', 'usage'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_current_subscription(self, obj):
        subscription = obj.subscriptions.filter(is_current=True).first()
        if not subscription:
            return None
        return SubscriptionSerializer(subscription).data

    def get_quota(self, obj):
        quota = getattr(obj, 'quota', None)
        if not quota:
            return None
        return TenantQuotaSerializer(quota).data

    def get_usage(self, obj):
        """
        Return usage stats. Safe when tenant tables are not in the current schema
        (e.g. platform academy create runs in public schema where MediaFile may not exist).
        """
        # Avoid triggering an extra DB query for `obj.quota` when this method
        # is called directly (tests assert no "write" operations).
        state = getattr(obj, "_state", None)
        quota = getattr(state, "fields_cache", {}).get("quota") if state else None
        from saas_platform.analytics.services import StatsService
        from saas_platform.quotas.services import QuotaService

        try:
            from tenant.media.models import MediaFile
            storage_used = MediaFile.objects.filter(
                academy=obj,
                is_active=True
            ).aggregate(total=Sum('file_size'))['total'] or 0
        except Exception:
            storage_used = 0

        try:
            db_size_bytes = StatsService.get_academy_db_size_bytes(obj.id)
        except Exception:
            db_size_bytes = 0

        usage = getattr(obj, 'usage', None)
        usage_obj = usage
        students_count = usage.students_count if usage else 0
        coaches_count = usage.coaches_count if usage else 0
        admins_count = usage.admins_count if usage else 0
        classes_count = usage.classes_count if usage else 0
        counts_computed_at = usage.counts_computed_at if usage else None

        storage_warning_threshold_pct = getattr(quota, 'storage_warning_threshold_pct', 80) if quota else 80
        if usage_obj and quota:
            storage_status = usage_obj.get_storage_status(quota)
            storage_usage_pct = usage_obj.get_storage_usage_pct(quota)
        else:
            storage_status = 'unlimited' if not quota or (getattr(quota, 'storage_bytes_limit', 0) or 0) <= 0 else 'ok'
            storage_usage_pct = 0.0

        return {
            'storage_used_bytes': storage_used,
            'storage_used_gb': round(storage_used / (1024 ** 3), 2),
            'storage_status': storage_status,
            'storage_usage_pct': storage_usage_pct,
            'storage_warning_threshold_pct': storage_warning_threshold_pct,
            'db_size_bytes': db_size_bytes,
            'db_size_gb': round(db_size_bytes / (1024 ** 3), 2),
            'total_used_bytes': storage_used + db_size_bytes,
            'total_used_gb': round((storage_used + db_size_bytes) / (1024 ** 3), 2),
            'students_count': students_count,
            'coaches_count': coaches_count,
            'admins_count': admins_count,
            'classes_count': classes_count,
            'counts_computed_at': counts_computed_at,
            'days_to_quota': QuotaService.estimate_days_to_quota(obj),
        }


class AcademyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating academies (excludes id, timestamps)."""
    
    owner_email = serializers.EmailField(required=False, allow_blank=True, write_only=True)
    plan_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    slug = serializers.SlugField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    
    class Meta:
        model = Academy
        fields = [
            'name', 'slug', 'email', 'phone', 'website',
            'address_line1', 'address_line2', 'city', 'state',
            'postal_code', 'country', 'timezone', 'currency',
            'owner_email', 'plan_id'
        ]
    
    def validate(self, attrs):
        """Validate and auto-generate fields if needed."""
        # Auto-generate slug from name if not provided
        if not attrs.get('slug') and attrs.get('name'):
            from django.utils.text import slugify
            base_slug = slugify(attrs['name'])
            slug = base_slug
            counter = 1
            while Academy.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            attrs['slug'] = slug
        
        # Use owner_email as email if email not provided
        if not attrs.get('email') and attrs.get('owner_email'):
            attrs['email'] = attrs['owner_email']
        
        # Ensure email is provided (either directly or via owner_email)
        if not attrs.get('email'):
            raise serializers.ValidationError({
                'email': 'Email is required. Provide either email or owner_email.'
            })

        # Require address line 1
        addr1 = attrs.get('address_line1')
        if not addr1 or not str(addr1).strip():
            raise serializers.ValidationError({
                'address_line1': 'Address line 1 is required.'
            })
        attrs['address_line1'] = str(addr1).strip()

        # Require phone
        phone = attrs.get('phone')
        if not phone or not str(phone).strip():
            raise serializers.ValidationError({
                'phone': 'Phone is required.'
            })

        return attrs
    
    def validate_slug(self, value):
        """Ensure slug is unique."""
        if value and Academy.objects.filter(slug=value).exists():
            raise serializers.ValidationError("An academy with this slug already exists.")
        return value
    
    def validate_owner_email(self, value):
        """Validate owner email format if provided."""
        if value:
            value = value.lower().strip()
        return value

    def validate_country(self, value):
        """Validate that country, when provided, matches an active Country master (ISO alpha-3 code)."""
        if not value:
            return value
        code = str(value).strip().upper()
        if len(code) != 3:
            raise serializers.ValidationError("Country must be a 3-letter ISO alpha-3 code.")
        if not Country.objects.filter(code=code, is_active=True).exists():
            raise serializers.ValidationError("Unsupported country code.")
        return code

    def validate_timezone(self, value):
        """Validate timezone against Timezone master when provided."""
        if not value:
            return value
        value = str(value).strip()
        if len(value) > 50:
            raise serializers.ValidationError("Invalid timezone identifier.")
        if not Timezone.objects.filter(code=value, is_active=True).exists():
            raise serializers.ValidationError("Unsupported timezone.")
        return value

    def validate_currency(self, value):
        """Validate currency against Currency master when provided."""
        if not value:
            return value
        if len(str(value).strip()) != 3:
            raise serializers.ValidationError("Currency must be a 3-letter code.")
        code = str(value).strip().upper()
        if not Currency.objects.filter(code=code, is_active=True).exists():
            raise serializers.ValidationError("Unsupported currency code.")
        return code

    def validate_phone(self, value):
        """Validate phone syntax (digits, +, spaces, hyphens, parentheses; 8-20 chars, min 8 digits)."""
        if not value or not str(value).strip():
            return value  # validate() already requires it
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

    def validate_plan_id(self, value):
        """Ensure plan exists and is active if provided."""
        if value is None:
            return value
        from saas_platform.subscriptions.models import Plan
        try:
            Plan.objects.get(id=value, is_active=True)
        except Plan.DoesNotExist:
            raise serializers.ValidationError("Plan not found or inactive.")
        return value


class AcademyListSerializer(serializers.ModelSerializer):
    """Serializer for list view (excludes detailed fields)."""
    primary_admin = serializers.SerializerMethodField()

    class Meta:
        model = Academy
        fields = [
            'id', 'name', 'slug', 'email', 'phone',
            'onboarding_completed', 'is_active',
            'created_at', 'updated_at',
            'primary_admin',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_primary_admin(self, obj):
        """
        Return primary admin user info for this academy (email and active status).

        Uses tenant schema if available; safe to return None on any error.
        """
        # Only attempt schema-based lookup when using Postgres and schema_name is set
        if connection.vendor != 'postgresql' or not getattr(obj, 'schema_name', None):
            return None

        try:
            User = get_user_model()
            with schema_context(obj.schema_name) as active:
                if not active:
                    return None
                admin = (
                    User.objects
                    .filter(academy=obj, role=getattr(User, 'Role', None).ADMIN if hasattr(User, 'Role') else 'ADMIN')
                    .order_by('created_at')
                    .first()
                )
                if not admin:
                    return None
                return {
                    'email': admin.email,
                    'is_active': getattr(admin, 'is_active', False),
                    'is_verified': getattr(admin, 'is_verified', False),
                }
        except Exception:
            return None


class PlanUpdateSerializer(serializers.Serializer):
    """Serializer for updating academy's subscription plan."""
    
    plan_id = serializers.IntegerField(required=True)
    start_at = serializers.DateTimeField(required=False, allow_null=True)
    overrides_json = serializers.JSONField(required=False, default=dict)
    
    def validate_plan_id(self, value):
        """Ensure plan exists and is active."""
        from saas_platform.subscriptions.models import Plan
        try:
            plan = Plan.objects.get(id=value, is_active=True)
        except Plan.DoesNotExist:
            raise serializers.ValidationError("Plan not found or inactive.")
        return value


class QuotaUpdateSerializer(serializers.Serializer):
    """Serializer for updating quota overrides."""
    
    # Accept both nested and flat formats
    overrides_json = serializers.JSONField(required=False)
    # Accept flat quota fields directly
    storage_bytes = serializers.IntegerField(required=False, min_value=0)
    storage_warning_threshold_pct = serializers.IntegerField(
        required=False,
        min_value=0,
        max_value=99,
    )
    max_students = serializers.IntegerField(required=False, min_value=0)
    max_coaches = serializers.IntegerField(required=False, min_value=0)
    max_admins = serializers.IntegerField(required=False, min_value=0)
    max_classes = serializers.IntegerField(required=False, min_value=0)
    
    def validate(self, attrs):
        """Validate and convert flat format to nested format if needed."""
        valid_keys = {
            'storage_bytes',
            'storage_warning_threshold_pct',
            'max_students', 'max_coaches',
            'max_admins', 'max_classes'
        }
        
        # If flat quota fields are provided, wrap in overrides_json
        quota_fields = {k: v for k, v in attrs.items() if k in valid_keys}
        
        if quota_fields and not attrs.get('overrides_json'):
            # Convert flat format to nested format
            attrs['overrides_json'] = quota_fields
            # Remove flat fields from attrs
            for key in valid_keys:
                attrs.pop(key, None)
        elif quota_fields and attrs.get('overrides_json'):
            # Both formats provided - merge flat fields into overrides_json
            overrides = attrs['overrides_json'].copy()
            overrides.update(quota_fields)
            attrs['overrides_json'] = overrides
            # Remove flat fields
            for key in valid_keys:
                attrs.pop(key, None)
        
        # Ensure overrides_json is provided
        if not attrs.get('overrides_json'):
            raise serializers.ValidationError(
                "Either overrides_json or quota fields (storage_bytes, max_students, etc.) must be provided."
            )
        
        # Validate overrides_json structure
        overrides = attrs['overrides_json']
        if not isinstance(overrides, dict):
            raise serializers.ValidationError("overrides_json must be a dictionary.")
        
        for key in overrides.keys():
            if key not in valid_keys:
                raise serializers.ValidationError(
                    f"Invalid quota key: {key}. Valid keys are: {', '.join(sorted(valid_keys))}"
                )
            
            if not isinstance(overrides[key], int) or overrides[key] < 0:
                raise serializers.ValidationError(
                    f"Quota value for {key} must be a non-negative integer."
                )
        
        return attrs
