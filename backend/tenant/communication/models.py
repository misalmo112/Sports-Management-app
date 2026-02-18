"""
Communication models for tenant layer (Feedback).
"""
from django.db import models
from django.contrib.auth import get_user_model
from saas_platform.tenants.models import Academy
from tenant.students.models import Student

User = get_user_model()


class FeedbackStatus(models.TextChoices):
    """Feedback status choices."""
    PENDING = 'PENDING', 'Pending'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    RESOLVED = 'RESOLVED', 'Resolved'
    CLOSED = 'CLOSED', 'Closed'


class FeedbackPriority(models.TextChoices):
    """Feedback priority choices."""
    LOW = 'LOW', 'Low'
    MEDIUM = 'MEDIUM', 'Medium'
    HIGH = 'HIGH', 'High'
    URGENT = 'URGENT', 'Urgent'


class Feedback(models.Model):
    """Feedback model for parent feedback."""
    
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='feedback',
        db_index=True
    )
    
    parent = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='feedback',
        db_index=True,
        limit_choices_to={'role': 'PARENT'}
    )
    
    student = models.ForeignKey(
        Student,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='feedback',
        db_index=True
    )
    
    subject = models.CharField(max_length=255)
    message = models.TextField()
    
    status = models.CharField(
        max_length=20,
        choices=FeedbackStatus.choices,
        default=FeedbackStatus.PENDING,
        db_index=True
    )
    
    priority = models.CharField(
        max_length=20,
        choices=FeedbackPriority.choices,
        default=FeedbackPriority.MEDIUM,
        db_index=True
    )
    
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_feedback',
        limit_choices_to={'role__in': ['ADMIN', 'OWNER']}
    )
    
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_complaints'  # Keep old table name for backward compatibility
        indexes = [
            models.Index(fields=['academy', 'status']),
            models.Index(fields=['academy', 'parent']),
            models.Index(fields=['academy', 'assigned_to']),
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'Feedback'
        verbose_name_plural = 'Feedback'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Feedback #{self.id} - {self.subject} ({self.status})"
