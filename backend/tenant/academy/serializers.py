"""
Serializers for tenant academy settings.
"""
from rest_framework import serializers
from saas_platform.tenants.models import Academy
from tenant.masters.constants import CURRENCIES


class AcademySettingsSerializer(serializers.ModelSerializer):
    """Serializer for academy settings."""

    class Meta:
        model = Academy
        fields = [
            'id',
            'name',
            'email',
            'timezone',
            'currency',
        ]
        read_only_fields = ['id', 'name', 'email']

    def validate_timezone(self, value):
        if not value or len(value) > 50:
            raise serializers.ValidationError("Invalid timezone identifier.")
        try:
            import pytz
            pytz.timezone(value)
        except (Exception,):
            if '/' not in value and value != 'UTC':
                pass
        return value

    def validate_currency(self, value):
        if not value or len(value) != 3:
            raise serializers.ValidationError("Currency must be a 3-letter code.")
        if value not in CURRENCIES:
            raise serializers.ValidationError("Unsupported currency code.")
        return value
