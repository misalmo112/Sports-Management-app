from rest_framework import serializers
from saas_platform.quotas.models import TenantQuota, TenantUsage


class TenantQuotaSerializer(serializers.ModelSerializer):
    """Serializer for TenantQuota."""
    
    academy_id = serializers.UUIDField(source='academy.id', read_only=True)
    academy_name = serializers.CharField(source='academy.name', read_only=True)
    
    class Meta:
        model = TenantQuota
        fields = [
            'id', 'academy_id', 'academy_name',
            'storage_bytes_limit', 'max_students', 'max_coaches',
            'max_admins', 'max_classes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TenantUsageSerializer(serializers.ModelSerializer):
    """Serializer for TenantUsage."""
    
    academy_id = serializers.UUIDField(source='academy.id', read_only=True)
    academy_name = serializers.CharField(source='academy.name', read_only=True)
    
    class Meta:
        model = TenantUsage
        fields = [
            'id', 'academy_id', 'academy_name',
            'storage_used_bytes', 'students_count', 'coaches_count',
            'admins_count', 'classes_count', 'counts_computed_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
