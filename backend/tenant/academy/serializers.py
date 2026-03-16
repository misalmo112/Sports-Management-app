"""
Serializers for tenant academy settings.
"""
from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers
from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.serializers import SubscriptionSerializer
from saas_platform.quotas.models import TenantUsage
from saas_platform.quotas.serializers import TenantQuotaSerializer
from saas_platform.subscriptions.models import Subscription
from tenant.masters.constants import CURRENCIES


class AcademySettingsSerializer(serializers.ModelSerializer):
    """Serializer for tenant-editable academy settings."""

    class Meta:
        model = Academy
        fields = [
            'id',
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
        read_only_fields = ['id']

    def validate_timezone(self, value):
        if not value or len(value) > 50:
            raise serializers.ValidationError("Invalid timezone identifier.")
        try:
            import pytz
            pytz.timezone(value)
        except Exception as exc:
            raise serializers.ValidationError("Invalid timezone identifier.") from exc
        return value

    def validate_currency(self, value):
        if not value or len(value) != 3:
            raise serializers.ValidationError("Currency must be a 3-letter code.")
        if value not in CURRENCIES:
            raise serializers.ValidationError("Unsupported currency code.")
        return value


class PlanSummarySerializer(serializers.Serializer):
    """Serializer for tenant-visible plan details."""

    id = serializers.IntegerField()
    name = serializers.CharField()
    slug = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    price_monthly = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    price_yearly = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    currency = serializers.CharField()
    trial_days = serializers.IntegerField()
    seat_based_pricing = serializers.BooleanField()


class AcademySubscriptionSerializer(SubscriptionSerializer):
    """Tenant-facing current subscription serializer."""

    plan_details = serializers.SerializerMethodField()

    class Meta(SubscriptionSerializer.Meta):
        fields = SubscriptionSerializer.Meta.fields + ['plan_details']

    def get_plan_details(self, obj: Subscription):
        return PlanSummarySerializer(obj.plan).data


class AcademySubscriptionSummarySerializer(serializers.Serializer):
    """Serializer for current academy subscription summary."""

    academy_id = serializers.UUIDField(source='id', read_only=True)
    academy_name = serializers.CharField(source='name', read_only=True)
    current_subscription = serializers.SerializerMethodField()

    def get_current_subscription(self, obj: Academy):
        subscription = obj.subscriptions.filter(is_current=True).select_related('plan').first()
        if not subscription:
            return None
        return AcademySubscriptionSerializer(subscription).data


class AcademyUsageSummarySerializer(serializers.Serializer):
    """Serializer for current academy quota and usage summary."""

    academy_id = serializers.UUIDField(source='id', read_only=True)
    academy_name = serializers.CharField(source='name', read_only=True)
    quota = serializers.SerializerMethodField()
    usage = serializers.SerializerMethodField()

    def get_quota(self, obj: Academy):
        quota = getattr(obj, 'quota', None)
        if not quota:
            return None
        return TenantQuotaSerializer(quota).data

    def get_usage(self, obj: Academy):
        from saas_platform.analytics.services import StatsService
        from tenant.media.models import MediaFile

        storage_used = MediaFile.objects.filter(
            academy=obj,
            is_active=True,
        ).aggregate(total=Sum('file_size'))['total'] or 0
        db_size_bytes = StatsService.get_academy_db_size_bytes(obj.id)
        total_used_bytes = storage_used + db_size_bytes

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
                },
            )

        if usage.storage_used_bytes != storage_used:
            TenantUsage.objects.filter(pk=usage.pk).update(
                storage_used_bytes=storage_used,
                counts_computed_at=timezone.now(),
            )

        return {
            'storage_used_bytes': storage_used,
            'storage_used_gb': round(storage_used / (1024 ** 3), 2),
            'db_size_bytes': db_size_bytes,
            'db_size_gb': round(db_size_bytes / (1024 ** 3), 2),
            'total_used_bytes': total_used_bytes,
            'total_used_gb': round(total_used_bytes / (1024 ** 3), 2),
            'students_count': usage.students_count,
            'coaches_count': usage.coaches_count,
            'admins_count': usage.admins_count,
            'classes_count': usage.classes_count,
            'counts_computed_at': usage.counts_computed_at,
        }
