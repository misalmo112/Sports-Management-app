from rest_framework import serializers
from django.db.models import Sum
from django.utils import timezone
from saas_platform.tenants.models import Academy
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
        from saas_platform.quotas.models import TenantUsage
        from saas_platform.analytics.services import StatsService
        from tenant.media.models import MediaFile

        storage_used = MediaFile.objects.filter(
            academy=obj,
            is_active=True
        ).aggregate(total=Sum('file_size'))['total'] or 0
        db_size_bytes = StatsService.get_academy_db_size_bytes(obj.id)

        usage = getattr(obj, 'usage', None)
        if not usage:
            usage, _ = TenantUsage.objects.get_or_create(
                academy=obj,
                defaults={
                    'storage_used_bytes': storage_used,
                    'students_count': 0,
                    'coaches_count': 0,
                    'admins_count': 0,
                    'classes_count': 0,
                }
            )

        if usage.storage_used_bytes != storage_used:
            TenantUsage.objects.filter(pk=usage.pk).update(
                storage_used_bytes=storage_used,
                counts_computed_at=timezone.now()
            )

        return {
            'storage_used_bytes': storage_used,
            'storage_used_gb': round(storage_used / (1024 ** 3), 2),
            'db_size_bytes': db_size_bytes,
            'db_size_gb': round(db_size_bytes / (1024 ** 3), 2),
            'total_used_bytes': storage_used + db_size_bytes,
            'total_used_gb': round((storage_used + db_size_bytes) / (1024 ** 3), 2),
            'students_count': usage.students_count,
            'coaches_count': usage.coaches_count,
            'admins_count': usage.admins_count,
            'classes_count': usage.classes_count,
            'counts_computed_at': usage.counts_computed_at,
        }


class AcademyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating academies (excludes id, timestamps)."""
    
    owner_email = serializers.EmailField(required=False, allow_blank=True, write_only=True)
    slug = serializers.SlugField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    
    class Meta:
        model = Academy
        fields = [
            'name', 'slug', 'email', 'phone', 'website',
            'address_line1', 'address_line2', 'city', 'state',
            'postal_code', 'country', 'timezone', 'currency', 'owner_email'
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


class AcademyListSerializer(serializers.ModelSerializer):
    """Serializer for list view (excludes detailed fields)."""
    
    class Meta:
        model = Academy
        fields = [
            'id', 'name', 'slug', 'email', 'phone',
            'onboarding_completed', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


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
    max_students = serializers.IntegerField(required=False, min_value=0)
    max_coaches = serializers.IntegerField(required=False, min_value=0)
    max_admins = serializers.IntegerField(required=False, min_value=0)
    max_classes = serializers.IntegerField(required=False, min_value=0)
    
    def validate(self, attrs):
        """Validate and convert flat format to nested format if needed."""
        valid_keys = {
            'storage_bytes', 'max_students', 'max_coaches',
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
