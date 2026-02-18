from django.db import models
from django.conf import settings


class AuditAction(models.TextChoices):
    CREATE = 'CREATE', 'Create'
    UPDATE = 'UPDATE', 'Update'
    DELETE = 'DELETE', 'Delete'
    PLAN_CHANGE = 'PLAN_CHANGE', 'Plan Change'
    QUOTA_UPDATE = 'QUOTA_UPDATE', 'Quota Update'


class ResourceType(models.TextChoices):
    ACADEMY = 'ACADEMY', 'Academy'
    SUBSCRIPTION = 'SUBSCRIPTION', 'Subscription'
    PLAN = 'PLAN', 'Plan'
    QUOTA = 'QUOTA', 'Quota'


class AuditLog(models.Model):
    """Platform audit log for tracking all platform operations."""
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    action = models.CharField(
        max_length=20,
        choices=AuditAction.choices,
        db_index=True
    )
    resource_type = models.CharField(
        max_length=20,
        choices=ResourceType.choices,
        db_index=True
    )
    resource_id = models.CharField(max_length=255, db_index=True)
    academy = models.ForeignKey(
        'tenants.Academy',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    changes_json = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'audit_logs'
        indexes = [
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['academy', 'created_at']),
            models.Index(fields=['user', 'created_at']),
        ]
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.action} {self.resource_type} {self.resource_id} by {self.user} at {self.created_at}"


class ErrorLog(models.Model):
    """Platform error log for superadmin visibility."""
    
    request_id = models.CharField(max_length=64, blank=True, db_index=True)
    path = models.CharField(max_length=255, blank=True)
    method = models.CharField(max_length=10, blank=True)
    status_code = models.PositiveIntegerField(db_index=True)
    code = models.CharField(max_length=50, db_index=True)
    message = models.TextField(blank=True)
    stacktrace = models.TextField(blank=True, null=True)
    academy = models.ForeignKey(
        'tenants.Academy',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='error_logs'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='error_logs'
    )
    role = models.CharField(max_length=20, blank=True)
    service = models.CharField(max_length=50, default='backend', db_index=True)
    environment = models.CharField(max_length=50, default='local', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'error_logs'
        indexes = [
            models.Index(fields=['created_at']),
            models.Index(fields=['status_code', 'created_at']),
            models.Index(fields=['code', 'created_at']),
            models.Index(fields=['academy', 'created_at']),
            models.Index(fields=['user', 'created_at']),
        ]
        verbose_name = 'Error Log'
        verbose_name_plural = 'Error Logs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.code} {self.status_code} {self.path} at {self.created_at}"
