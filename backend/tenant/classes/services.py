"""
Enrollment service for managing student enrollments in classes.
"""
from django.db import transaction
from django.core.exceptions import ValidationError
from tenant.classes.models import Class, Enrollment
from tenant.students.models import Student


class EnrollmentService:
    """Service for enrollment business logic."""
    
    @staticmethod
    @transaction.atomic
    def enroll_student(student, class_obj, notes=''):
        """
        Enroll a student in a class.
        
        Args:
            student: Student instance
            class_obj: Class instance
            notes: Optional enrollment notes
        
        Returns:
            Enrollment instance
        
        Raises:
            ValidationError: If enrollment cannot be completed
        """
        # Validate academy match
        if student.academy_id != class_obj.academy_id:
            raise ValidationError(
                'Student and class must belong to the same academy.'
            )
        
        # Check class capacity
        if class_obj.is_full:
            raise ValidationError('Class is at full capacity.')
        
        # Check for duplicate enrollment
        existing = Enrollment.objects.filter(
            student=student,
            class_obj=class_obj,
            status=Enrollment.Status.ENROLLED
        )
        if existing.exists():
            raise ValidationError('Student is already enrolled in this class.')
        
        # Create enrollment
        enrollment = Enrollment.objects.create(
            academy=class_obj.academy,
            student=student,
            class_obj=class_obj,
            status=Enrollment.Status.ENROLLED,
            notes=notes
        )
        
        # Update class enrollment count
        class_obj.current_enrollment = class_obj.enrollments.filter(
            status=Enrollment.Status.ENROLLED
        ).count()
        class_obj.save(update_fields=['current_enrollment', 'updated_at'])
        
        return enrollment
    
    @staticmethod
    @transaction.atomic
    def unenroll_student(enrollment):
        """
        Unenroll a student from a class.
        
        Args:
            enrollment: Enrollment instance
        
        Returns:
            None
        """
        class_obj = enrollment.class_obj
        
        # Delete enrollment
        enrollment.delete()
        
        # Update class enrollment count
        class_obj.current_enrollment = class_obj.enrollments.filter(
            status=Enrollment.Status.ENROLLED
        ).count()
        class_obj.save(update_fields=['current_enrollment', 'updated_at'])
    
    @staticmethod
    @transaction.atomic
    def update_enrollment_status(enrollment, new_status, notes=''):
        """
        Update enrollment status.
        
        Args:
            enrollment: Enrollment instance
            new_status: New status (ENROLLED, COMPLETED, DROPPED)
            notes: Optional notes
        
        Returns:
            Enrollment instance
        """
        enrollment.status = new_status
        if notes:
            enrollment.notes = notes
        enrollment.save()
        
        # Update class enrollment count if status changed
        if new_status != Enrollment.Status.ENROLLED:
            class_obj = enrollment.class_obj
            class_obj.current_enrollment = class_obj.enrollments.filter(
                status=Enrollment.Status.ENROLLED
            ).count()
            class_obj.save(update_fields=['current_enrollment', 'updated_at'])
        
        return enrollment
