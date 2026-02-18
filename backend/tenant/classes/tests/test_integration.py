from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from tenant.students.models import Parent, Student
from tenant.coaches.models import Coach
from tenant.classes.models import Class, Enrollment
from tenant.classes.services import EnrollmentService
from django.utils import timezone

User = get_user_model()


class EnrollmentIntegrationTest(TestCase):
    """Integration tests for enrollment flow."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
            onboarding_completed=True
        )
        
        self.plan = Plan.objects.create(
            name="Basic Plan",
            slug="basic-plan",
            limits_json={
                'max_students': 100,
                'max_coaches': 10,
                'max_classes': 50
            }
        )
        self.subscription = Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )
        
        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@test.com"
        )
        
        self.coach = Coach.objects.create(
            academy=self.academy,
            first_name="Mike",
            last_name="Coach",
            email="mike@test.com"
        )
    
    def test_full_enrollment_flow(self):
        """Test complete enrollment flow: create student, class, enroll."""
        # Create student
        student = Student.objects.create(
            academy=self.academy,
            parent=self.parent,
            first_name="Jane",
            last_name="Doe"
        )
        
        # Create class
        class_obj = Class.objects.create(
            academy=self.academy,
            name="Soccer Training",
            coach=self.coach,
            max_capacity=20
        )
        
        # Enroll student
        enrollment = EnrollmentService.enroll_student(
            student=student,
            class_obj=class_obj
        )
        
        self.assertIsNotNone(enrollment)
        self.assertEqual(enrollment.status, Enrollment.Status.ENROLLED)
        
        # Verify class count updated
        class_obj.refresh_from_db()
        self.assertEqual(class_obj.current_enrollment, 1)
        
        # Unenroll student
        EnrollmentService.unenroll_student(enrollment)
        
        # Verify class count updated
        class_obj.refresh_from_db()
        self.assertEqual(class_obj.current_enrollment, 0)
    
    def test_quota_enforcement_across_models(self):
        """Test quota enforcement works across all models."""
        # Create students up to limit
        plan = Plan.objects.create(
            name="Limited Plan",
            slug="limited-plan",
            limits_json={
                'max_students': 5,
                'max_coaches': 3,
                'max_classes': 10
            }
        )
        subscription = Subscription.objects.create(
            academy=self.academy,
            plan=plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )
        
        # Create 5 students (at limit)
        for i in range(5):
            Student.objects.create(
                academy=self.academy,
                parent=self.parent,
                first_name=f"Student{i}",
                last_name="Doe"
            )
        
        # Try to create 6th student via service (should fail)
        from shared.services.quota import check_quota_before_create, QuotaExceededError
        
        with self.assertRaises(QuotaExceededError):
            check_quota_before_create(self.academy, 'students', 1)
