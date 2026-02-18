from django.db import models
from django.utils import timezone
from saas_platform.tenants.models import Academy
import uuid


class MediaFile(models.Model):
    """Media file model for storing uploaded files in S3/MinIO."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='media_files',
        db_index=True
    )
    
    # Class association (nullable for legacy records, required for new uploads)
    class_obj = models.ForeignKey(
        'classes.Class',
        on_delete=models.CASCADE,
        related_name='media_files',
        null=True,
        blank=True,
        db_index=True,
        help_text='Class this media file is associated with'
    )
    
    # File Information
    file_name = models.CharField(max_length=255, db_index=True)
    file_path = models.CharField(max_length=1024)  # S3 object key/path
    file_size = models.BigIntegerField(db_index=True)  # Size in bytes
    mime_type = models.CharField(max_length=100, blank=True)
    
    # Optional Metadata
    description = models.TextField(blank=True)
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_media_files'
        indexes = [
            models.Index(fields=['academy', 'is_active']),
            models.Index(fields=['academy', 'created_at']),
            models.Index(fields=['academy', 'class_obj']),
            models.Index(fields=['file_name']),
        ]
        verbose_name = 'Media File'
        verbose_name_plural = 'Media Files'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.file_name} ({self.academy.name})"
    
    def get_file_url(self):
        """Generate file URL from storage backend."""
        from tenant.media.services import MediaService
        return MediaService.get_file_url(self)
    
    @property
    def file_url(self):
        """Property wrapper for get_file_url()."""
        return self.get_file_url()
