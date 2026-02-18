from django.db import models
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from saas_platform.tenants.models import Academy
from tenant.students.models import Student
from tenant.coaches.models import Coach
from tenant.classes.models import Class

User = get_user_model()


class Attendance(models.Model):
    """Attendance model for tracking student attendance in classes."""
    
    class Status(models.TextChoices):
        PRESENT = 'PRESENT', 'Present'
        ABSENT = 'ABSENT', 'Absent'
    
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='attendance_records',
        db_index=True
    )
    
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='attendance_records',
        db_index=True
    )
    
    class_obj = models.ForeignKey(
        Class,
        on_delete=models.CASCADE,
        related_name='attendance_records',
        db_index=True
    )
    
    date = models.DateField(db_index=True)
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PRESENT,
        db_index=True
    )
    
    notes = models.TextField(blank=True)
    
    marked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='marked_attendance_records',
        help_text='User who marked this attendance'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_attendance'
        indexes = [
            models.Index(fields=['academy', 'date']),
            models.Index(fields=['academy', 'student', 'date']),
            models.Index(fields=['academy', 'class_obj', 'date']),
            models.Index(fields=['status']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'class_obj', 'date'],
                name='unique_attendance_per_student_class_date'
            )
        ]
        verbose_name = 'Attendance'
        verbose_name_plural = 'Attendance Records'
        ordering = ['-date', 'student']
    
    def __str__(self):
        return f"{self.student.full_name} - {self.class_obj.name} - {self.date} ({self.status})"
    
    def clean(self):
        """Validate attendance data."""
        # Ensure student and class belong to same academy
        if self.student.academy_id != self.class_obj.academy_id:
            raise ValidationError('Student and class must belong to the same academy.')
        
        # Ensure academy matches
        if self.student.academy_id != self.academy_id:
            raise ValidationError('Student must belong to the same academy.')
        
        if self.class_obj.academy_id != self.academy_id:
            raise ValidationError('Class must belong to the same academy.')
    
    def save(self, *args, **kwargs):
        """Override save to validate data."""
        self.full_clean()
        super().save(*args, **kwargs)


class CoachAttendance(models.Model):
    """Coach attendance model for tracking coach attendance in classes."""
    
    class Status(models.TextChoices):
        PRESENT = 'PRESENT', 'Present'
        ABSENT = 'ABSENT', 'Absent'
    
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='coach_attendance_records',
        db_index=True
    )
    
    coach = models.ForeignKey(
        Coach,
        on_delete=models.CASCADE,
        related_name='attendance_records',
        db_index=True
    )
    
    class_obj = models.ForeignKey(
        Class,
        on_delete=models.CASCADE,
        related_name='coach_attendance_records',
        db_index=True
    )
    
    date = models.DateField(db_index=True)
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PRESENT,
        db_index=True
    )
    
    notes = models.TextField(blank=True)
    
    marked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='marked_coach_attendance_records',
        help_text='User who marked this attendance'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_coach_attendance'
        indexes = [
            models.Index(fields=['academy', 'date']),
            models.Index(fields=['academy', 'coach', 'date']),
            models.Index(fields=['academy', 'class_obj', 'date']),
            models.Index(fields=['status']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['coach', 'class_obj', 'date'],
                name='unique_coach_attendance_per_coach_class_date'
            )
        ]
        verbose_name = 'Coach Attendance'
        verbose_name_plural = 'Coach Attendance Records'
        ordering = ['-date', 'coach']
    
    def __str__(self):
        return f"{self.coach.full_name} - {self.class_obj.name} - {self.date} ({self.status})"
    
    def clean(self):
        """Validate coach attendance data."""
        # Ensure coach and class belong to same academy
        if self.coach.academy_id != self.class_obj.academy_id:
            raise ValidationError('Coach and class must belong to the same academy.')
        
        # Ensure academy matches
        if self.coach.academy_id != self.academy_id:
            raise ValidationError('Coach must belong to the same academy.')
        
        if self.class_obj.academy_id != self.academy_id:
            raise ValidationError('Class must belong to the same academy.')
    
    def save(self, *args, **kwargs):
        """Override save to validate data."""
        self.full_clean()
        super().save(*args, **kwargs)
