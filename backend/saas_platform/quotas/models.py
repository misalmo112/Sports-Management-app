from django.db import models
from django.utils import timezone


class TenantQuota(models.Model):
    """Denormalized effective quota limits per academy for performance."""
    
    id = models.AutoField(primary_key=True)
    academy = models.OneToOneField(
        'tenants.Academy',
        on_delete=models.CASCADE,
        related_name='quota'
    )
    
    # Effective quota limits (calculated from Plan + Subscription overrides)
    storage_bytes_limit = models.BigIntegerField(default=0, db_index=True)
    max_students = models.IntegerField(default=0, db_index=True)
    max_coaches = models.IntegerField(default=0, db_index=True)
    max_admins = models.IntegerField(default=0, db_index=True)
    max_classes = models.IntegerField(default=0, db_index=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_quotas'
        verbose_name = 'Tenant Quota'
        verbose_name_plural = 'Tenant Quotas'
    
    def __str__(self):
        return f"Quota for {self.academy.name}"


class TenantUsage(models.Model):
    """Real-time usage tracking for academy quotas."""
    
    id = models.AutoField(primary_key=True)
    academy = models.OneToOneField(
        'tenants.Academy',
        on_delete=models.CASCADE,
        related_name='usage'
    )
    
    # Storage Usage (bytes)
    # Updated atomically on upload/delete with select_for_update()
    storage_used_bytes = models.BigIntegerField(default=0, db_index=True)
    
    # Count Usage (computed on-demand or cached periodically)
    students_count = models.IntegerField(default=0, db_index=True)
    coaches_count = models.IntegerField(default=0, db_index=True)
    admins_count = models.IntegerField(default=0, db_index=True)
    classes_count = models.IntegerField(default=0, db_index=True)
    
    # Last computed timestamp (for count quotas)
    counts_computed_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_usages'
        verbose_name = 'Tenant Usage'
        verbose_name_plural = 'Tenant Usages'
    
    def __str__(self):
        return f"Usage for {self.academy.name}"
