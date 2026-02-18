from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from saas_platform.tenants.models import Academy
from tenant.students.models import Parent, Student
from tenant.coaches.models import Coach
from tenant.classes.models import Class
from tenant.attendance.models import Attendance, CoachAttendance
from datetime import date

User = get_user_model()


class AttendanceModelTest(TestCase):
    """Test Attendance model."""
    
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
        self.student = Student.objects.create(
            academy=self.academy,
            parent=self.parent,
            first_name="Jane",
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
    
    def test_create_attendance(self):
        """Test creating an attendance record."""
        attendance = Attendance.objects.create(
            academy=self.academy,
            student=self.student,
            class_obj=self.class_obj,
            date=date.today(),
            status=Attendance.Status.PRESENT,
            marked_by=self.user
        )
        self.assertEqual(attendance.student, self.student)
        self.assertEqual(attendance.class_obj, self.class_obj)
        self.assertEqual(attendance.status, Attendance.Status.PRESENT)
        self.assertEqual(attendance.academy, self.academy)
        self.assertEqual(attendance.marked_by, self.user)
    
    def test_attendance_unique_constraint(self):
        """Test unique constraint prevents duplicate attendance records."""
        Attendance.objects.create(
            academy=self.academy,
            student=self.student,
            class_obj=self.class_obj,
            date=date.today(),
            status=Attendance.Status.PRESENT
        )
        
        # Try to create duplicate attendance
        with self.assertRaises(Exception):
            Attendance.objects.create(
                academy=self.academy,
                student=self.student,
                class_obj=self.class_obj,
                date=date.today(),
                status=Attendance.Status.ABSENT
            )
    
    def test_attendance_validation(self):
        """Test attendance validation."""
        # Create another academy
        academy2 = Academy.objects.create(
            name="Another Academy",
            slug="another-academy",
            email="another@academy.com"
        )
        student2 = Student.objects.create(
            academy=academy2,
            first_name="Bob",
            last_name="Smith"
        )
        
        # Try to create attendance with student from different academy
        attendance = Attendance(
            academy=self.academy,
            student=student2,
            class_obj=self.class_obj,
            date=date.today()
        )
        with self.assertRaises(ValidationError):
            attendance.full_clean()
    
    def test_attendance_status_choices(self):
        """Test attendance status choices."""
        attendance = Attendance.objects.create(
            academy=self.academy,
            student=self.student,
            class_obj=self.class_obj,
            date=date.today(),
            status=Attendance.Status.PRESENT
        )
        self.assertEqual(attendance.status, Attendance.Status.PRESENT)
        
        attendance.status = Attendance.Status.ABSENT
        attendance.save()
        self.assertEqual(attendance.status, Attendance.Status.ABSENT)
    
    def test_attendance_str_representation(self):
        """Test attendance string representation."""
        attendance = Attendance.objects.create(
            academy=self.academy,
            student=self.student,
            class_obj=self.class_obj,
            date=date(2024, 1, 15),
            status=Attendance.Status.PRESENT
        )
        expected = f"{self.student.full_name} - {self.class_obj.name} - 2024-01-15 (PRESENT)"
        self.assertEqual(str(attendance), expected)


class CoachAttendanceModelTest(TestCase):
    """Test CoachAttendance model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com"
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
    
    def test_create_coach_attendance(self):
        """Test creating a coach attendance record."""
        coach_attendance = CoachAttendance.objects.create(
            academy=self.academy,
            coach=self.coach,
            class_obj=self.class_obj,
            date=date.today(),
            status=CoachAttendance.Status.PRESENT,
            marked_by=self.user
        )
        self.assertEqual(coach_attendance.coach, self.coach)
        self.assertEqual(coach_attendance.class_obj, self.class_obj)
        self.assertEqual(coach_attendance.status, CoachAttendance.Status.PRESENT)
        self.assertEqual(coach_attendance.academy, self.academy)
        self.assertEqual(coach_attendance.marked_by, self.user)
    
    def test_coach_attendance_unique_constraint(self):
        """Test unique constraint prevents duplicate coach attendance records."""
        CoachAttendance.objects.create(
            academy=self.academy,
            coach=self.coach,
            class_obj=self.class_obj,
            date=date.today(),
            status=CoachAttendance.Status.PRESENT
        )
        
        # Try to create duplicate attendance
        with self.assertRaises(Exception):
            CoachAttendance.objects.create(
                academy=self.academy,
                coach=self.coach,
                class_obj=self.class_obj,
                date=date.today(),
                status=CoachAttendance.Status.ABSENT
            )
    
    def test_coach_attendance_validation(self):
        """Test coach attendance validation."""
        # Create another academy
        academy2 = Academy.objects.create(
            name="Another Academy",
            slug="another-academy",
            email="another@academy.com"
        )
        coach2 = Coach.objects.create(
            academy=academy2,
            first_name="Bob",
            last_name="Coach",
            email="bob@example.com"
        )
        
        # Try to create attendance with coach from different academy
        coach_attendance = CoachAttendance(
            academy=self.academy,
            coach=coach2,
            class_obj=self.class_obj,
            date=date.today()
        )
        with self.assertRaises(ValidationError):
            coach_attendance.full_clean()
    
    def test_coach_attendance_status_choices(self):
        """Test coach attendance status choices."""
        coach_attendance = CoachAttendance.objects.create(
            academy=self.academy,
            coach=self.coach,
            class_obj=self.class_obj,
            date=date.today(),
            status=CoachAttendance.Status.PRESENT
        )
        self.assertEqual(coach_attendance.status, CoachAttendance.Status.PRESENT)
        
        coach_attendance.status = CoachAttendance.Status.ABSENT
        coach_attendance.save()
        self.assertEqual(coach_attendance.status, CoachAttendance.Status.ABSENT)
    
    def test_coach_attendance_str_representation(self):
        """Test coach attendance string representation."""
        coach_attendance = CoachAttendance.objects.create(
            academy=self.academy,
            coach=self.coach,
            class_obj=self.class_obj,
            date=date(2024, 1, 15),
            status=CoachAttendance.Status.PRESENT
        )
        expected = f"{self.coach.full_name} - {self.class_obj.name} - 2024-01-15 (PRESENT)"
        self.assertEqual(str(coach_attendance), expected)
