from django.db import models
from django.db.models import Index
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
    storage_warning_threshold_pct = models.PositiveSmallIntegerField(
        default=80,
        help_text="Storage usage warning threshold percentage (0-99).",
    )
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

    def get_storage_usage_pct(self, quota: TenantQuota) -> float:
        """
        Compute current storage usage percentage against the effective quota.

        Returns:
            Float rounded to 2 decimals.
        """
        limit = getattr(quota, "storage_bytes_limit", 0) or 0
        if limit <= 0:
            return 0.0
        pct = (self.storage_used_bytes / float(limit)) * 100.0
        return round(pct, 2)

    def get_storage_status(self, quota: TenantQuota) -> str:
        """
        Compute storage status for the given quota.

        Returns one of:
            - 'unlimited'
            - 'ok'
            - 'warning'
            - 'exceeded'
        """
        limit = getattr(quota, "storage_bytes_limit", 0) or 0
        if limit <= 0:
            return "unlimited"

        current_pct = self.get_storage_usage_pct(quota)
        warning_pct = getattr(quota, "storage_warning_threshold_pct", None)
        warning_pct = 80 if warning_pct is None else int(warning_pct)

        if current_pct >= 100.0:
            return "exceeded"
        if current_pct >= float(warning_pct):
            return "warning"
        return "ok"


class StorageSnapshot(models.Model):
    academy = models.ForeignKey(
        "tenants.Academy",
        on_delete=models.CASCADE,
        related_name="storage_snapshots",
    )

    storage_used_bytes = models.BigIntegerField()
    db_size_bytes = models.BigIntegerField(default=0)
    total_bytes = models.BigIntegerField(default=0)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "storage_snapshots"
        indexes = [Index(fields=["academy", "recorded_at"])]
        ordering = ["-recorded_at"]
        get_latest_by = "recorded_at"
