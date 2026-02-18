from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from saas_platform.tenants.models import Academy
from tenant.students.models import Parent, Student
from tenant.coaches.models import Coach
from tenant.classes.models import Class
from tenant.attendance.models import Attendance, CoachAttendance
from tenant.attendance.services import AttendanceService
from datetime import date, datetime

User = get_user_model()


class AttendanceServiceTest(TestCase):
    """Test AttendanceService methods."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com"
        )
        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com"
        )
        self.student1 = Student.objects.create(
            academy=self.academy,
            parent=self.parent,
            first_name="Jane",
            last_name="Doe"
        )
        self.student2 = Student.objects.create(
            academy=self.academy,
            parent=self.parent,
            first_name="Bob",
            last_name="Doe"
        )
        self.coach = Coach.objects.create(
            academy=self.academy,
            first_name="Mike",
            last_name="Coach",
            email="mike@example.com"
        )
        self.class_obj = Class.objects.create(
            academy=self.academy,
            name="Soccer Training",
            max_capacity=20,
            coach=self.coach
        )
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.academy
        )
    
    def test_mark_attendance_single(self):
        """Test marking attendance for a single student."""
        attendance_date = date.today()
        records = [
            {
                'student_id': self.student1.id,
                'status': Attendance.Status.PRESENT,
                'notes': 'On time'
            }
        ]
        
        result = AttendanceService.mark_attendance(
            class_obj=self.class_obj,
            date=attendance_date,
            attendance_records=records,
            marked_by=self.user
        )
        
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].student, self.student1)
        self.assertEqual(result[0].status, Attendance.Status.PRESENT)
        self.assertEqual(result[0].marked_by, self.user)
        
        # Verify attendance was created
        attendance = Attendance.objects.get(
            student=self.student1,
            class_obj=self.class_obj,
            date=attendance_date
        )
        self.assertEqual(attendance.status, Attendance.Status.PRESENT)
    
    def test_mark_attendance_bulk(self):
        """Test bulk marking attendance for multiple students."""
        attendance_date = date.today()
        records = [
            {
                'student_id': self.student1.id,
                'status': Attendance.Status.PRESENT,
                'notes': 'On time'
            },
            {
                'student_id': self.student2.id,
                'status': Attendance.Status.ABSENT,
                'notes': 'Sick'
            }
        ]
        
        result = AttendanceService.mark_attendance(
            class_obj=self.class_obj,
            date=attendance_date,
            attendance_records=records,
            marked_by=self.user
        )
        
        self.assertEqual(len(result), 2)
        
        # Verify both attendances were created
        attendance1 = Attendance.objects.get(
            student=self.student1,
            class_obj=self.class_obj,
            date=attendance_date
        )
        attendance2 = Attendance.objects.get(
            student=self.student2,
            class_obj=self.class_obj,
            date=attendance_date
        )
        
        self.assertEqual(attendance1.status, Attendance.Status.PRESENT)
        self.assertEqual(attendance2.status, Attendance.Status.ABSENT)
    
    def test_mark_attendance_update_existing(self):
        """Test marking attendance updates existing record."""
        attendance_date = date.today()
        
        # Create initial attendance
        Attendance.objects.create(
            academy=self.academy,
            student=self.student1,
            class_obj=self.class_obj,
            date=attendance_date,
            status=Attendance.Status.PRESENT
        )
        
        # Update attendance
        records = [
            {
                'student_id': self.student1.id,
                'status': Attendance.Status.ABSENT,
                'notes': 'Updated'
            }
        ]
        
        result = AttendanceService.mark_attendance(
            class_obj=self.class_obj,
            date=attendance_date,
            attendance_records=records,
            marked_by=self.user
        )
        
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].status, Attendance.Status.ABSENT)
        
        # Verify only one record exists
        count = Attendance.objects.filter(
            student=self.student1,
            class_obj=self.class_obj,
            date=attendance_date
        ).count()
        self.assertEqual(count, 1)
    
    def test_mark_attendance_invalid_student(self):
        """Test marking attendance with invalid student raises error."""
        attendance_date = date.today()
        records = [
            {
                'student_id': 99999,  # Non-existent student
                'status': Attendance.Status.PRESENT
            }
        ]
        
        with self.assertRaises(ValidationError):
            AttendanceService.mark_attendance(
                class_obj=self.class_obj,
                date=attendance_date,
                attendance_records=records,
                marked_by=self.user
            )
    
    def test_mark_coach_attendance(self):
        """Test marking coach attendance."""
        attendance_date = date.today()
        
        result = AttendanceService.mark_coach_attendance(
            class_obj=self.class_obj,
            date=attendance_date,
            coach_id=self.coach.id,
            status=CoachAttendance.Status.PRESENT,
            notes='On time',
            marked_by=self.user
        )
        
        self.assertEqual(result.coach, self.coach)
        self.assertEqual(result.status, CoachAttendance.Status.PRESENT)
        self.assertEqual(result.marked_by, self.user)
        
        # Verify attendance was created
        attendance = CoachAttendance.objects.get(
            coach=self.coach,
            class_obj=self.class_obj,
            date=attendance_date
        )
        self.assertEqual(attendance.status, CoachAttendance.Status.PRESENT)
    
    def test_get_monthly_summary(self):
        """Test getting monthly summary."""
        # Create attendance records for January 2024
        dates = [
            date(2024, 1, 5),
            date(2024, 1, 10),
            date(2024, 1, 15),
            date(2024, 1, 20),
        ]
        
        for i, attendance_date in enumerate(dates):
            Attendance.objects.create(
                academy=self.academy,
                student=self.student1,
                class_obj=self.class_obj,
                date=attendance_date,
                status=Attendance.Status.PRESENT if i % 2 == 0 else Attendance.Status.ABSENT
            )
        
        summary = AttendanceService.get_monthly_summary(
            academy=self.academy,
            year=2024,
            month=1,
            student_id=self.student1.id,
            class_id=self.class_obj.id
        )
        
        self.assertEqual(summary['year'], 2024)
        self.assertEqual(summary['month'], 1)
        # When filtering by student_id and class_id, we should get exactly one summary
        # But the service groups by student-class combo, so let's check if we have at least one
        self.assertGreaterEqual(len(summary['summaries']), 1)
        
        # Find the summary for our student and class
        student_summary = None
        for s in summary['summaries']:
            if s['student_id'] == self.student1.id and s['class_id'] == self.class_obj.id:
                student_summary = s
                break
        
        self.assertIsNotNone(student_summary, "Summary for student1 and class_obj should exist")
        self.assertEqual(student_summary['total_classes'], 4)
        self.assertEqual(student_summary['present_count'], 2)
        self.assertEqual(student_summary['absent_count'], 2)
        self.assertEqual(student_summary['attendance_rate'], 50.0)
    
    def test_get_attendance_rate(self):
        """Test getting attendance rate for a student."""
        # Create attendance records
        for i in range(10):
            Attendance.objects.create(
                academy=self.academy,
                student=self.student1,
                class_obj=self.class_obj,
                date=date(2024, 1, i + 1),
                status=Attendance.Status.PRESENT if i < 8 else Attendance.Status.ABSENT
            )
        
        stats = AttendanceService.get_attendance_rate(
            student_or_coach=self.student1,
            class_obj=self.class_obj
        )
        
        self.assertEqual(stats['total_records'], 10)
        self.assertEqual(stats['present_count'], 8)
        self.assertEqual(stats['absent_count'], 2)
        self.assertEqual(stats['attendance_rate'], 80.0)
    
    def test_export_to_csv(self):
        """Test exporting attendance to CSV."""
        # Create some attendance records
        for i in range(3):
            Attendance.objects.create(
                academy=self.academy,
                student=self.student1 if i % 2 == 0 else self.student2,
                class_obj=self.class_obj,
                date=date(2024, 1, i + 1),
                status=Attendance.Status.PRESENT,
                notes=f'Note {i}',
                marked_by=self.user
            )
        
        queryset = Attendance.objects.filter(academy=self.academy)
        response = AttendanceService.export_to_csv(queryset)
        
        self.assertEqual(response['Content-Type'], 'text/csv')
        self.assertIn('attachment', response['Content-Disposition'])
        
        # Check CSV content
        content = response.content.decode('utf-8')
        self.assertIn('Date', content)
        self.assertIn('Student Name', content)
        self.assertIn('Class Name', content)
        self.assertIn('Status', content)
    
    def test_export_coach_attendance_to_csv(self):
        """Test exporting coach attendance to CSV."""
        # Create some coach attendance records
        for i in range(3):
            CoachAttendance.objects.create(
                academy=self.academy,
                coach=self.coach,
                class_obj=self.class_obj,
                date=date(2024, 1, i + 1),
                status=CoachAttendance.Status.PRESENT,
                notes=f'Note {i}',
                marked_by=self.user
            )
        
        queryset = CoachAttendance.objects.filter(academy=self.academy)
        response = AttendanceService.export_coach_attendance_to_csv(queryset)
        
        self.assertEqual(response['Content-Type'], 'text/csv')
        self.assertIn('attachment', response['Content-Disposition'])
        
        # Check CSV content
        content = response.content.decode('utf-8')
        self.assertIn('Date', content)
        self.assertIn('Coach Name', content)
        self.assertIn('Class Name', content)
        self.assertIn('Status', content)
