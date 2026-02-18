from django.test import TestCase
from django.core.exceptions import ValidationError
from saas_platform.tenants.models import Academy
from tenant.students.models import Parent, Student
from tenant.coaches.models import Coach
from tenant.classes.models import Class, Enrollment


class ClassModelTest(TestCase):
    """Test Class model."""
    
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
    
    def test_create_class(self):
        """Test creating a class."""
        class_obj = Class.objects.create(
            academy=self.academy,
            name="Soccer Training",
            description="Basic soccer training",
            coach=self.coach,
            max_capacity=20
        )
        self.assertEqual(class_obj.name, "Soccer Training")
        self.assertTrue(class_obj.is_active)
        self.assertEqual(class_obj.academy, self.academy)
        self.assertEqual(class_obj.coach, self.coach)
        self.assertEqual(class_obj.current_enrollment, 0)
    
    def test_class_capacity_properties(self):
        """Test capacity-related properties."""
        class_obj = Class.objects.create(
            academy=self.academy,
            name="Soccer Training",
            max_capacity=10
        )
        
        self.assertEqual(class_obj.available_spots, 10)
        self.assertFalse(class_obj.is_full)
        
        # Enroll 10 students
        parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com"
        )
        for i in range(10):
            student = Student.objects.create(
                academy=self.academy,
                parent=parent,
                first_name=f"Student{i}",
                last_name="Doe"
            )
            Enrollment.objects.create(
                academy=self.academy,
                student=student,
                class_obj=class_obj,
                status=Enrollment.Status.ENROLLED
            )
        
        class_obj.refresh_from_db()
        self.assertEqual(class_obj.current_enrollment, 10)
        self.assertEqual(class_obj.available_spots, 0)
        self.assertTrue(class_obj.is_full)
    
    def test_class_validation(self):
        """Test class validation."""
        # End date before start date should fail
        class_obj = Class(
            academy=self.academy,
            name="Soccer Training",
            start_date="2024-12-01",
            end_date="2024-11-01"
        )
        with self.assertRaises(ValidationError):
            class_obj.full_clean()
    
    def test_soft_delete(self):
        """Test soft delete functionality."""
        class_obj = Class.objects.create(
            academy=self.academy,
            name="Soccer Training",
            max_capacity=20
        )
        
        class_obj.is_active = False
        class_obj.save()
        
        self.assertFalse(class_obj.is_active)
        self.assertIn(class_obj, Class.objects.all())
        self.assertNotIn(class_obj, Class.objects.filter(is_active=True))


class EnrollmentModelTest(TestCase):
    """Test Enrollment model."""
    
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
        self.class_obj = Class.objects.create(
            academy=self.academy,
            name="Soccer Training",
            max_capacity=20
        )
    
    def test_create_enrollment(self):
        """Test creating an enrollment."""
        enrollment = Enrollment.objects.create(
            academy=self.academy,
            student=self.student,
            class_obj=self.class_obj,
            status=Enrollment.Status.ENROLLED
        )
        self.assertEqual(enrollment.student, self.student)
        self.assertEqual(enrollment.class_obj, self.class_obj)
        self.assertEqual(enrollment.status, Enrollment.Status.ENROLLED)
        self.assertEqual(enrollment.academy, self.academy)
    
    def test_enrollment_updates_class_count(self):
        """Test enrollment updates class enrollment count."""
        self.assertEqual(self.class_obj.current_enrollment, 0)
        
        enrollment = Enrollment.objects.create(
            academy=self.academy,
            student=self.student,
            class_obj=self.class_obj,
            status=Enrollment.Status.ENROLLED
        )
        
        self.class_obj.refresh_from_db()
        self.assertEqual(self.class_obj.current_enrollment, 1)
        
        # Delete enrollment
        enrollment.delete()
        self.class_obj.refresh_from_db()
        self.assertEqual(self.class_obj.current_enrollment, 0)
    
    def test_duplicate_enrollment_prevention(self):
        """Test unique constraint prevents duplicate enrollments."""
        Enrollment.objects.create(
            academy=self.academy,
            student=self.student,
            class_obj=self.class_obj,
            status=Enrollment.Status.ENROLLED
        )
        
        # Try to create duplicate enrollment
        with self.assertRaises(Exception):
            Enrollment.objects.create(
                academy=self.academy,
                student=self.student,
                class_obj=self.class_obj,
                status=Enrollment.Status.ENROLLED
            )
    
    def test_enrollment_status_change_updates_count(self):
        """Test changing enrollment status updates class count."""
        enrollment = Enrollment.objects.create(
            academy=self.academy,
            student=self.student,
            class_obj=self.class_obj,
            status=Enrollment.Status.ENROLLED
        )
        
        self.class_obj.refresh_from_db()
        self.assertEqual(self.class_obj.current_enrollment, 1)
        
        # Change status to DROPPED
        enrollment.status = Enrollment.Status.DROPPED
        enrollment.save()
        
        self.class_obj.refresh_from_db()
        self.assertEqual(self.class_obj.current_enrollment, 0)
    
    def test_enrollment_validation(self):
        """Test enrollment validation."""
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
        
        # Try to enroll student from different academy
        enrollment = Enrollment(
            academy=self.academy,
            student=student2,
            class_obj=self.class_obj
        )
        with self.assertRaises(ValidationError):
            enrollment.full_clean()
