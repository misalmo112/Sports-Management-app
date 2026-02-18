from django.test import TestCase
from django.core.exceptions import ValidationError
from saas_platform.tenants.models import Academy
from tenant.students.models import Parent, Student


class ParentModelTest(TestCase):
    """Test Parent model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com"
        )
    
    def test_create_parent(self):
        """Test creating a parent."""
        parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            phone="1234567890"
        )
        self.assertEqual(parent.full_name, "John Doe")
        self.assertTrue(parent.is_active)
        self.assertEqual(parent.academy, self.academy)
    
    def test_parent_email_uniqueness_per_academy(self):
        """Test email uniqueness per academy."""
        Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com"
        )
        
        # Same email in same academy should fail
        with self.assertRaises(Exception):
            Parent.objects.create(
                academy=self.academy,
                first_name="Jane",
                last_name="Doe",
                email="john@example.com"
            )
    
    def test_parent_email_can_repeat_in_different_academy(self):
        """Test same email can exist in different academies."""
        academy2 = Academy.objects.create(
            name="Another Academy",
            slug="another-academy",
            email="another@academy.com"
        )
        
        Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com"
        )
        
        # Same email in different academy should work
        parent2 = Parent.objects.create(
            academy=academy2,
            first_name="John",
            last_name="Doe",
            email="john@example.com"
        )
        self.assertIsNotNone(parent2)
    
    def test_soft_delete(self):
        """Test soft delete functionality."""
        parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com"
        )
        
        parent.is_active = False
        parent.save()
        
        self.assertFalse(parent.is_active)
        self.assertIn(parent, Parent.objects.all())
        self.assertNotIn(parent, Parent.objects.filter(is_active=True))


class StudentModelTest(TestCase):
    """Test Student model."""
    
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
    
    def test_create_student(self):
        """Test creating a student."""
        student = Student.objects.create(
            academy=self.academy,
            parent=self.parent,
            first_name="Jane",
            last_name="Doe",
            date_of_birth="2010-01-01"
        )
        self.assertEqual(student.full_name, "Jane Doe")
        self.assertTrue(student.is_active)
        self.assertEqual(student.academy, self.academy)
        self.assertEqual(student.parent, self.parent)
    
    def test_student_without_parent(self):
        """Test creating student without parent."""
        student = Student.objects.create(
            academy=self.academy,
            first_name="Jane",
            last_name="Doe"
        )
        self.assertIsNone(student.parent)
    
    def test_student_age_calculation(self):
        """Test age calculation."""
        from datetime import date, timedelta
        
        # Student born 10 years ago (use a specific date to avoid edge cases)
        birth_date = date.today().replace(year=date.today().year - 10)
        student = Student.objects.create(
            academy=self.academy,
            first_name="Jane",
            last_name="Doe",
            date_of_birth=birth_date
        )
        # Age should be 10 (or 9 if birthday hasn't occurred this year)
        self.assertIn(student.age, [9, 10])
    
    def test_soft_delete(self):
        """Test soft delete functionality."""
        student = Student.objects.create(
            academy=self.academy,
            first_name="Jane",
            last_name="Doe"
        )
        
        student.is_active = False
        student.save()
        
        self.assertFalse(student.is_active)
        self.assertIn(student, Student.objects.all())
        self.assertNotIn(student, Student.objects.filter(is_active=True))
