from rest_framework import serializers
from saas_platform.masters.models import Currency, Timezone, Country


class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = [
            "id",
            "code",
            "name",
            "is_active",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def to_representation(self, instance):
        """Ensure safe values for list/detail (avoid None for string fields)."""
        data = super().to_representation(instance)
        if data.get("name") is None:
            data["name"] = ""
        if data.get("code") is None:
            data["code"] = ""
        return data

    def validate_code(self, value):
        if value is None:
            raise serializers.ValidationError("Currency code is required.")
        value = str(value).strip().upper()
        if len(value) != 3:
            raise serializers.ValidationError("Currency code must be exactly 3 characters.")
        return value


class TimezoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Timezone
        fields = [
            "id",
            "code",
            "name",
            "is_active",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = [
            "id",
            "code",
            "name",
            "phone_code",
            "region",
            "is_active",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def to_representation(self, instance):
        """Ensure safe values for list/detail (avoid None for string fields)."""
        data = super().to_representation(instance)
        if data.get("name") is None:
            data["name"] = ""
        if data.get("code") is None:
            data["code"] = ""
        if data.get("phone_code") is None:
            data["phone_code"] = ""
        if data.get("region") is None:
            data["region"] = ""
        return data

    def validate_code(self, value):
        if value is None:
            raise serializers.ValidationError("Country code is required.")
        value = str(value).strip().upper()
        if len(value) != 3:
            raise serializers.ValidationError("Country code must be exactly 3 characters (ISO alpha-3).")
        return value
