"""
Serializers for Platform Audit Logs API.
"""
from rest_framework import serializers
from saas_platform.audit.models import AuditLog, AuditAction, ResourceType, ErrorLog


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for AuditLog."""
    
    user_email = serializers.EmailField(source='user.email', read_only=True)
    academy_name = serializers.CharField(source='academy.name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    resource_type_display = serializers.CharField(source='get_resource_type_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_email',
            'action', 'action_display',
            'resource_type', 'resource_type_display',
            'resource_id', 'academy', 'academy_name',
            'changes_json', 'ip_address', 'user_agent',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ErrorLogSerializer(serializers.ModelSerializer):
    """Serializer for ErrorLog."""
    
    user_email = serializers.EmailField(source='user.email', read_only=True)
    academy_name = serializers.CharField(source='academy.name', read_only=True)
    
    class Meta:
        model = ErrorLog
        fields = [
            'id',
            'request_id',
            'path',
            'method',
            'status_code',
            'code',
            'message',
            'stacktrace',
            'academy',
            'academy_name',
            'user',
            'user_email',
            'role',
            'service',
            'environment',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']
