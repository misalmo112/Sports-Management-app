from rest_framework import serializers
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus


class PlanSerializer(serializers.ModelSerializer):
    """Full plan representation."""
    
    # Accept 'price' and 'billing_cycle' for API compatibility
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True, write_only=True)
    billing_cycle = serializers.CharField(required=False, allow_blank=True, write_only=True)
    slug = serializers.SlugField(required=False, allow_blank=True)
    
    class Meta:
        model = Plan
        fields = [
            'id', 'name', 'slug', 'description',
            'price', 'price_monthly', 'price_yearly', 'currency', 'billing_cycle',
            'trial_days', 'limits_json', 'seat_based_pricing',
            'is_active', 'is_public',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, attrs):
        """Validate and map fields."""
        # Map 'price' to price_monthly or price_yearly based on billing_cycle
        if 'price' in attrs:
            price_value = attrs.pop('price')
            billing_cycle = attrs.pop('billing_cycle', 'MONTHLY').upper()
            
            if billing_cycle == 'MONTHLY':
                attrs['price_monthly'] = price_value
            elif billing_cycle == 'YEARLY':
                attrs['price_yearly'] = price_value
            else:
                # Default to monthly if billing_cycle is invalid
                attrs['price_monthly'] = price_value
        
        # Auto-generate slug from name if not provided
        if not attrs.get('slug') and attrs.get('name'):
            from django.utils.text import slugify
            base_slug = slugify(attrs['name'])
            slug = base_slug
            counter = 1
            while Plan.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            attrs['slug'] = slug
        
        return attrs
    
    def validate_limits_json(self, value):
        """Validate limits_json structure."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("limits_json must be a dictionary.")
        
        valid_keys = {
            'storage_bytes', 'max_students', 'max_coaches',
            'max_admins', 'max_classes'
        }
        
        # Check for invalid keys
        invalid_keys = set(value.keys()) - valid_keys
        if invalid_keys:
            raise serializers.ValidationError(
                f"Invalid keys in limits_json: {', '.join(invalid_keys)}. "
                f"Valid keys are: {', '.join(sorted(valid_keys))}"
            )
        
        # Validate values are non-negative integers
        for key, val in value.items():
            if not isinstance(val, int) or val < 0:
                raise serializers.ValidationError(
                    f"Value for {key} must be a non-negative integer."
                )
        
        return value
    
    def validate_slug(self, value):
        """Ensure slug is unique."""
        if not value:
            return value  # Will be auto-generated in validate()
        if self.instance and self.instance.slug == value:
            return value
        if Plan.objects.filter(slug=value).exists():
            raise serializers.ValidationError("A plan with this slug already exists.")
        return value


class SubscriptionSerializer(serializers.ModelSerializer):
    """Full subscription representation."""
    
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    academy_name = serializers.CharField(source='academy.name', read_only=True)
    
    class Meta:
        model = Subscription
        fields = [
            'id', 'academy', 'academy_name', 'plan', 'plan_name',
            'status', 'is_current', 'start_at', 'end_at', 'trial_ends_at',
            'overrides_json', 'canceled_at', 'cancel_reason',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SubscriptionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating subscriptions."""
    
    class Meta:
        model = Subscription
        fields = [
            'academy', 'plan', 'status', 'start_at', 'end_at',
            'trial_ends_at', 'overrides_json'
        ]
    
    def validate(self, attrs):
        """Validate subscription data."""
        academy = attrs.get('academy')
        plan = attrs.get('plan')
        
        if not plan.is_active:
            raise serializers.ValidationError("Cannot create subscription with inactive plan.")
        
        # Check if there's already a current subscription
        if Subscription.objects.filter(academy=academy, is_current=True).exists():
            # This will be handled by the service layer
            pass
        
        return attrs
