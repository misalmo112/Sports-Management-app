"""
Serializers for Platform Analytics API.
"""
from rest_framework import serializers


class PlatformStatsSerializer(serializers.Serializer):
    """Serializer for platform statistics."""
    
    academies = serializers.DictField()
    subscriptions = serializers.DictField()
    usage = serializers.DictField()
    per_academy_usage = serializers.ListField()
    generated_at = serializers.DateTimeField()


class PlatformErrorsSerializer(serializers.Serializer):
    """Serializer for platform errors."""
    
    error_counts = serializers.ListField()
    recent_errors = serializers.ListField()
    total_errors = serializers.IntegerField()
    date_from = serializers.DateTimeField(required=False, allow_null=True)
    date_to = serializers.DateTimeField(required=False, allow_null=True)
