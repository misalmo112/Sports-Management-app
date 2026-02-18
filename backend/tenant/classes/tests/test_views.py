from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory
from rest_framework import status
from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from tenant.students.models import Parent, Student
from tenant.coaches.models import Coach
from tenant.classes.models import Class, Enrollment
from tenant.classes.views import ClassViewSet
from django.utils import timezone

User = get_user_model()


class ClassViewSetTest(TestCase):
    """Test ClassViewSet API endpoints."""
    
    def setUp(self):
        self.factory = APIRequestFactory()
        
        self.academy1 = Academy.objects.create(
            name="Academy 1",
            slug="academy-1",
            email="academy1@test.com",
            onboarding_completed=True
        )
        
        self.plan = Plan.objects.create(
            name="Basic Plan",
            slug="basic-plan",
            limits_json={
                'max_students': 10,
                'max_coaches': 5,
                'max_classes': 20
            }
        )
        self.subscription = Subscription.objects.create(
            academy=self.academy1,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )
        
        self.admin = User.objects.create_user(
            email='admin@academy1.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.academy1
        )
        
        self.coach = Coach.objects.create(
            academy=self.academy1,
            first_name="Mike",
            last_name="Coach",
            email="mike@test.com"
        )
    
    def _create_request(self, method='get', path='/', data=None):
        """Helper to create request with academy context."""
        from rest_framework.test import force_authenticate
        
        if method == 'get':
            request = self.factory.get(path)
        elif method == 'post':
            request = self.factory.post(path, data, format='json')
        else:
            request = self.factory.get(path)
        
        request.user = self.admin
        request.academy = self.academy1
        # Force authenticate the user
        force_authenticate(request, user=request.user)
        return request
    
    def test_create_class_with_quota_check(self):
        """Test creating class with quota enforcement."""
        # Create classes up to quota limit
        for i in range(20):
            Class.objects.create(
                academy=self.academy1,
                name=f"Class {i}",
                max_capacity=10
            )
        
        # Try to create 21st class (should fail)
        request = self._create_request('post', '/api/v1/tenant/classes/', {
            'name': 'Class 21',
            'max_capacity': 10
        })
        viewset = ClassViewSet.as_view({'post': 'create'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('quota', response.data['detail'].lower())
    
    def test_enroll_student(self):
        """Test enrolling a student in a class."""
        parent = Parent.objects.create(
            academy=self.academy1,
            first_name="John",
            last_name="Doe",
            email="john@test.com"
        )
        student = Student.objects.create(
            academy=self.academy1,
            parent=parent,
            first_name="Jane",
            last_name="Doe"
        )
        class_obj = Class.objects.create(
            academy=self.academy1,
            name="Soccer Training",
            max_capacity=20
        )
        
        request = self._create_request('post', f'/api/v1/tenant/classes/{class_obj.id}/enroll/', {
            'student_id': student.id
        })
        viewset = ClassViewSet.as_view({'post': 'enroll'})
        response = viewset(request, pk=class_obj.id)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify enrollment was created
        enrollment = Enrollment.objects.get(student=student, class_obj=class_obj)
        self.assertEqual(enrollment.status, Enrollment.Status.ENROLLED)
        
        # Verify class enrollment count updated
        class_obj.refresh_from_db()
        self.assertEqual(class_obj.current_enrollment, 1)
    
    def test_enroll_student_capacity_check(self):
        """Test enrollment fails when class is at capacity."""
        parent = Parent.objects.create(
            academy=self.academy1,
            first_name="John",
            last_name="Doe",
            email="john@test.com"
        )
        class_obj = Class.objects.create(
            academy=self.academy1,
            name="Soccer Training",
            max_capacity=2
        )
        
        # Enroll 2 students
        for i in range(2):
            student = Student.objects.create(
                academy=self.academy1,
                parent=parent,
                first_name=f"Student{i}",
                last_name="Doe"
            )
            Enrollment.objects.create(
                academy=self.academy1,
                student=student,
                class_obj=class_obj,
                status=Enrollment.Status.ENROLLED
            )
        
        # Try to enroll 3rd student (should fail)
        student3 = Student.objects.create(
            academy=self.academy1,
            parent=parent,
            first_name="Student3",
            last_name="Doe"
        )
        
        request = self._create_request('post', f'/api/v1/tenant/classes/{class_obj.id}/enroll/', {
            'student_id': student3.id
        })
        viewset = ClassViewSet.as_view({'post': 'enroll'})
        response = viewset(request, pk=class_obj.id)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('capacity', response.data['detail'].lower())
