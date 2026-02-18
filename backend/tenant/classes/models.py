from django.db import models
from django.core.exceptions import ValidationError
from saas_platform.tenants.models import Academy
from tenant.students.models import Student
from tenant.coaches.models import Coach


class Class(models.Model):
    """Class model for academy training sessions."""
    
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='classes',
        db_index=True
    )
    
    # Basic Information
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Coach Assignment
    coach = models.ForeignKey(
        Coach,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_classes',
        db_index=True
    )
    
    # References to onboarding data
    sport = models.ForeignKey(
        'onboarding.Sport',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='classes',
        db_index=True
    )
    location = models.ForeignKey(
        'onboarding.Location',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='classes',
        db_index=True
    )
    # age_category can be added later if needed
    
    # Capacity
    max_capacity = models.PositiveIntegerField(default=20)
    current_enrollment = models.PositiveIntegerField(default=0, editable=False)
    
    # Schedule (stored as JSON for flexibility)
    # Structure: {
    #   "recurring": true,
    #   "days_of_week": ["monday", "wednesday", "friday"],
    #   "start_time": "18:00",
    #   "end_time": "19:30",
    #   "timezone": "UTC"
    # }
    schedule = models.JSONField(default=dict, blank=True)
    
    # Dates
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_classes'
        indexes = [
            models.Index(fields=['academy', 'coach']),
            models.Index(fields=['academy', 'is_active']),
            models.Index(fields=['academy', 'name']),
            models.Index(fields=['academy', 'sport']),
            models.Index(fields=['academy', 'location']),
        ]
        verbose_name = 'Class'
        verbose_name_plural = 'Classes'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.academy.name})"
    
    def clean(self):
        """Validate class data."""
        if self.end_date and self.start_date:
            if self.end_date < self.start_date:
                raise ValidationError('End date must be after start date.')
        
        if self.max_capacity < 1:
            raise ValidationError('Max capacity must be at least 1.')
    
    def save(self, *args, **kwargs):
        """Override save to update enrollment count."""
        self.full_clean()
        # Update current_enrollment from actual enrollments
        if self.pk:
            self.current_enrollment = self.enrollments.filter(
                status=Enrollment.Status.ENROLLED
            ).count()
        super().save(*args, **kwargs)
    
    @property
    def available_spots(self):
        """Calculate available spots."""
        return max(0, self.max_capacity - self.current_enrollment)
    
    @property
    def is_full(self):
        """Check if class is at full capacity."""
        return self.current_enrollment >= self.max_capacity


class Enrollment(models.Model):
    """Enrollment model linking students to classes."""
    
    class Status(models.TextChoices):
        ENROLLED = 'ENROLLED', 'Enrolled'
        COMPLETED = 'COMPLETED', 'Completed'
        DROPPED = 'DROPPED', 'Dropped'
    
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='enrollments',
        db_index=True
    )
    
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='enrollments',
        db_index=True
    )
    
    class_obj = models.ForeignKey(
        Class,
        on_delete=models.CASCADE,
        related_name='enrollments',
        db_index=True
    )
    
    # Enrollment Details
    enrolled_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ENROLLED,
        db_index=True
    )
    notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_enrollments'
        indexes = [
            models.Index(fields=['academy', 'student']),
            models.Index(fields=['academy', 'class_obj']),
            models.Index(fields=['student', 'class_obj']),
            models.Index(fields=['status']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'class_obj'],
                condition=models.Q(status='ENROLLED'),
                name='unique_active_enrollment_per_student_class'
            )
        ]
        verbose_name = 'Enrollment'
        verbose_name_plural = 'Enrollments'
        ordering = ['-enrolled_at']
    
    def __str__(self):
        return f"{self.student.full_name} in {self.class_obj.name}"
    
    def clean(self):
        """Validate enrollment data."""
        # Ensure student and class belong to same academy
        if self.student.academy_id != self.class_obj.academy_id:
            raise ValidationError('Student and class must belong to the same academy.')
        
        # Check class capacity if enrolling
        if self.status == self.Status.ENROLLED:
            if self.class_obj.is_full and not self.pk:
                raise ValidationError('Class is at full capacity.')
    
    def save(self, *args, **kwargs):
        """Override save to update class enrollment count."""
        self.full_clean()
        is_new = self.pk is None
        old_status = None
        
        if not is_new:
            old_enrollment = Enrollment.objects.get(pk=self.pk)
            old_status = old_enrollment.status
        
        super().save(*args, **kwargs)
        
        # Update class enrollment count
        if is_new or old_status != self.status:
            self.class_obj.current_enrollment = self.class_obj.enrollments.filter(
                status=self.Status.ENROLLED
            ).count()
            self.class_obj.save(update_fields=['current_enrollment', 'updated_at'])
    
    def delete(self, *args, **kwargs):
        """Override delete to update class enrollment count."""
        class_obj = self.class_obj
        super().delete(*args, **kwargs)
        
        # Update class enrollment count
        class_obj.current_enrollment = class_obj.enrollments.filter(
            status=self.Status.ENROLLED
        ).count()
        class_obj.save(update_fields=['current_enrollment', 'updated_at'])
