"""
Attendance service for managing student and coach attendance.
"""
from django.db import transaction
from django.core.exceptions import ValidationError
from django.db.models import Q, Count, Avg
from django.http import HttpResponse
from django.utils import timezone
from datetime import datetime, date
import csv
from io import StringIO

from tenant.attendance.models import Attendance, CoachAttendance
from tenant.classes.models import Class
from tenant.students.models import Student
from tenant.coaches.models import Coach


class AttendanceService:
    """Service for attendance business logic."""
    
    @staticmethod
    @transaction.atomic
    def mark_attendance(class_obj, date, attendance_records, marked_by=None):
        """
        Bulk mark attendance for multiple students in a class.
        
        Args:
            class_obj: Class instance
            date: Date for attendance
            attendance_records: List of dicts with keys: student_id, status, notes (optional)
            marked_by: User who is marking attendance (optional)
        
        Returns:
            List of Attendance instances created/updated
        
        Raises:
            ValidationError: If attendance cannot be marked
        """
        if not class_obj:
            raise ValidationError('Class is required.')
        
        if not date:
            raise ValidationError('Date is required.')
        
        academy = class_obj.academy
        created_or_updated = []
        
        for record in attendance_records:
            student_id = record.get('student_id')
            status = record.get('status', Attendance.Status.PRESENT)
            notes = record.get('notes', '')
            
            if not student_id:
                continue
            
            # Validate student exists and belongs to academy
            try:
                student = Student.objects.get(
                    id=student_id,
                    academy=academy,
                    is_active=True
                )
            except Student.DoesNotExist:
                raise ValidationError(
                    f'Student with id {student_id} not found or does not belong to this academy.'
                )
            
            # Validate status
            if status not in [Attendance.Status.PRESENT, Attendance.Status.ABSENT]:
                raise ValidationError(f'Invalid status: {status}')
            
            # Create or update attendance record
            attendance, created = Attendance.objects.update_or_create(
                student=student,
                class_obj=class_obj,
                date=date,
                defaults={
                    'academy': academy,
                    'status': status,
                    'notes': notes,
                    'marked_by': marked_by
                }
            )
            created_or_updated.append(attendance)
        
        return created_or_updated
    
    @staticmethod
    @transaction.atomic
    def mark_coach_attendance(class_obj, date, coach_id, status, notes='', marked_by=None):
        """
        Mark attendance for a coach in a class.
        
        Args:
            class_obj: Class instance
            date: Date for attendance
            coach_id: Coach ID
            status: Attendance status (PRESENT or ABSENT)
            notes: Optional notes
            marked_by: User who is marking attendance (optional)
        
        Returns:
            CoachAttendance instance
        
        Raises:
            ValidationError: If attendance cannot be marked
        """
        if not class_obj:
            raise ValidationError('Class is required.')
        
        if not date:
            raise ValidationError('Date is required.')
        
        academy = class_obj.academy
        
        # Validate coach exists and belongs to academy
        try:
            coach = Coach.objects.get(
                id=coach_id,
                academy=academy,
                is_active=True
            )
        except Coach.DoesNotExist:
            raise ValidationError(
                f'Coach with id {coach_id} not found or does not belong to this academy.'
            )
        
        # Validate status
        if status not in [CoachAttendance.Status.PRESENT, CoachAttendance.Status.ABSENT]:
            raise ValidationError(f'Invalid status: {status}')
        
        # Create or update attendance record
        attendance, created = CoachAttendance.objects.update_or_create(
            coach=coach,
            class_obj=class_obj,
            date=date,
            defaults={
                'academy': academy,
                'status': status,
                'notes': notes,
                'marked_by': marked_by
            }
        )
        
        return attendance
    
    @staticmethod
    def get_monthly_summary(academy, year, month, student_id=None, class_id=None):
        """
        Generate monthly attendance summary.
        
        Args:
            academy: Academy instance
            year: Year (int)
            month: Month (int, 1-12)
            student_id: Optional student ID to filter by
            class_id: Optional class ID to filter by
        
        Returns:
            Dict with summary data
        """
        # Build date range for the month
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
        
        # Base queryset
        attendance_qs = Attendance.objects.filter(
            academy=academy,
            date__gte=start_date,
            date__lt=end_date
        )
        
        if student_id:
            attendance_qs = attendance_qs.filter(student_id=student_id)
        
        if class_id:
            attendance_qs = attendance_qs.filter(class_obj_id=class_id)
        
        # Get all unique classes in the month
        class_ids = attendance_qs.values_list('class_obj_id', flat=True).distinct()
        classes = Class.objects.filter(id__in=class_ids, academy=academy)
        
        # Calculate total classes (unique class-date combinations)
        total_classes = attendance_qs.values('class_obj', 'date').distinct().count()
        
        # Group by student and class
        summaries = []
        student_class_combos = attendance_qs.values('student', 'class_obj').distinct()
        
        for combo in student_class_combos:
            student_id = combo['student']
            class_obj_id = combo['class_obj']
            
            student_attendance = attendance_qs.filter(
                student_id=student_id,
                class_obj_id=class_obj_id
            )
            
            # Count attendance by status
            present_count = student_attendance.filter(status=Attendance.Status.PRESENT).count()
            absent_count = student_attendance.filter(status=Attendance.Status.ABSENT).count()
            
            # Get unique class dates for this student-class combo
            student_class_dates = student_attendance.values('date').distinct().count()
            
            # Calculate attendance rate
            total_records = present_count + absent_count
            attendance_rate = (present_count / total_records * 100) if total_records > 0 else 0.0
            
            try:
                student = Student.objects.get(id=student_id)
                class_obj = Class.objects.get(id=class_obj_id)
                
                summaries.append({
                    'student_id': student_id,
                    'student_name': student.full_name,
                    'class_id': class_obj_id,
                    'class_name': class_obj.name,
                    'total_classes': student_class_dates,
                    'present_count': present_count,
                    'absent_count': absent_count,
                    'attendance_rate': round(attendance_rate, 2)
                })
            except (Student.DoesNotExist, Class.DoesNotExist):
                continue
        
        # Calculate academy-wide summary
        all_students = attendance_qs.values('student').distinct().count()
        all_present = attendance_qs.filter(status=Attendance.Status.PRESENT).count()
        all_absent = attendance_qs.filter(status=Attendance.Status.ABSENT).count()
        all_total = all_present + all_absent
        avg_attendance_rate = (all_present / all_total * 100) if all_total > 0 else 0.0
        
        return {
            'year': year,
            'month': month,
            'summaries': summaries,
            'academy_summary': {
                'total_students': all_students,
                'total_classes': total_classes,
                'average_attendance_rate': round(avg_attendance_rate, 2)
            }
        }
    
    @staticmethod
    def get_attendance_rate(student_or_coach, class_obj=None, start_date=None, end_date=None):
        """
        Calculate attendance rate for a student or coach.
        
        Args:
            student_or_coach: Student or Coach instance
            class_obj: Optional Class instance to filter by
            start_date: Optional start date
            end_date: Optional end date
        
        Returns:
            Dict with attendance statistics
        """
        if isinstance(student_or_coach, Student):
            attendance_qs = Attendance.objects.filter(student=student_or_coach)
        elif isinstance(student_or_coach, Coach):
            attendance_qs = CoachAttendance.objects.filter(coach=student_or_coach)
        else:
            return None
        
        if class_obj:
            attendance_qs = attendance_qs.filter(class_obj=class_obj)
        
        if start_date:
            attendance_qs = attendance_qs.filter(date__gte=start_date)
        
        if end_date:
            attendance_qs = attendance_qs.filter(date__lte=end_date)
        
        present_count = attendance_qs.filter(status='PRESENT').count()
        absent_count = attendance_qs.filter(status='ABSENT').count()
        total = present_count + absent_count
        
        attendance_rate = (present_count / total * 100) if total > 0 else 0.0
        
        return {
            'total_records': total,
            'present_count': present_count,
            'absent_count': absent_count,
            'attendance_rate': round(attendance_rate, 2)
        }
    
    @staticmethod
    def export_to_csv(attendance_queryset, filename=None):
        """
        Export attendance records to CSV format.
        
        Args:
            attendance_queryset: QuerySet of Attendance records
            filename: Optional filename for the CSV
        
        Returns:
            HttpResponse with CSV content
        """
        if filename is None:
            filename = f'attendance_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        writer = csv.writer(response)
        
        # Write headers
        writer.writerow([
            'Date',
            'Student Name',
            'Class Name',
            'Status',
            'Notes',
            'Marked By',
            'Created At'
        ])
        
        # Write data
        for attendance in attendance_queryset.select_related('student', 'class_obj', 'marked_by'):
            writer.writerow([
                attendance.date.strftime('%Y-%m-%d'),
                attendance.student.full_name,
                attendance.class_obj.name,
                attendance.status,
                attendance.notes,
                attendance.marked_by.get_full_name() if attendance.marked_by else '',
                attendance.created_at.strftime('%Y-%m-%d %H:%M:%S') if attendance.created_at else ''
            ])
        
        return response
    
    @staticmethod
    def export_coach_attendance_to_csv(attendance_queryset, filename=None):
        """
        Export coach attendance records to CSV format.
        
        Args:
            attendance_queryset: QuerySet of CoachAttendance records
            filename: Optional filename for the CSV
        
        Returns:
            HttpResponse with CSV content
        """
        if filename is None:
            filename = f'coach_attendance_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        writer = csv.writer(response)
        
        # Write headers
        writer.writerow([
            'Date',
            'Coach Name',
            'Class Name',
            'Status',
            'Notes',
            'Marked By',
            'Created At'
        ])
        
        # Write data
        for attendance in attendance_queryset.select_related('coach', 'class_obj', 'marked_by'):
            writer.writerow([
                attendance.date.strftime('%Y-%m-%d'),
                attendance.coach.full_name,
                attendance.class_obj.name,
                attendance.status,
                attendance.notes,
                attendance.marked_by.get_full_name() if attendance.marked_by else '',
                attendance.created_at.strftime('%Y-%m-%d %H:%M:%S') if attendance.created_at else ''
            ])
        
        return response
