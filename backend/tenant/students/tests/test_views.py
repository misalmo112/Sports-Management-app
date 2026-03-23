from unittest.mock import patch

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework import status
from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from tenant.students.models import Parent, Student
from tenant.students.views import StudentViewSet
from django.utils import timezone

User = get_user_model()


class StudentViewSetTest(TestCase):
    """Test StudentViewSet API endpoints."""
    
    def setUp(self):
        self.client = APIClient()
        self.factory = APIRequestFactory()
        
        # Create academies
        self.academy1 = Academy.objects.create(
            name="Academy 1",
            slug="academy-1",
            email="academy1@test.com",
            onboarding_completed=True
        )
        self.academy2 = Academy.objects.create(
            name="Academy 2",
            slug="academy-2",
            email="academy2@test.com",
            onboarding_completed=True
        )
        
        # Create plan and subscription
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
        
        # Create users
        self.admin = User.objects.create_user(
            email='admin@academy1.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.academy1
        )
        
        self.parent_user = User.objects.create_user(
            email='parent@academy1.com',
            password='testpass123',
            role=User.Role.PARENT,
            academy=self.academy1
        )
        self.parent_user.save()
        
        # Create parent
        self.parent = Parent.objects.create(
            academy=self.academy1,
            first_name="John",
            last_name="Doe",
            email="parent@academy1.com"
        )
    
    def _create_request(self, method='get', path='/', data=None, user=None):
        """Helper to create request with academy context."""
        from rest_framework.test import force_authenticate
        
        if method == 'get':
            request = self.factory.get(path)
        elif method == 'post':
            request = self.factory.post(path, data, format='json')
        elif method == 'delete':
            request = self.factory.delete(path)
        else:
            request = self.factory.get(path)
        
        request.user = user or self.admin
        request.academy = self.academy1
        # Force authenticate the user
        force_authenticate(request, user=request.user)
        return request
    
    def test_list_students_as_admin(self):
        """Test listing students as admin."""
        Student.objects.create(
            academy=self.academy1,
            parent=self.parent,
            first_name="Jane",
            last_name="Doe"
        )
        
        request = self._create_request('get', '/api/v1/tenant/students/')
        viewset = StudentViewSet.as_view({'get': 'list'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_create_student_with_quota_check(self):
        """Test creating student with quota enforcement."""
        # Create students up to quota limit
        for i in range(10):
            Student.objects.create(
                academy=self.academy1,
                parent=self.parent,
                first_name=f"Student{i}",
                last_name="Doe"
            )
        
        # Try to create 11th student (should fail)
        request = self._create_request('post', '/api/v1/tenant/students/', {
            'parent': self.parent.id,
            'first_name': 'Student11',
            'last_name': 'Doe'
        })
        viewset = StudentViewSet.as_view({'post': 'create'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('quota', response.data['detail'].lower())
    
    def test_tenant_isolation(self):
        """Test tenant isolation - academy1 cannot see academy2 students."""
        # Create student in academy2
        parent2 = Parent.objects.create(
            academy=self.academy2,
            first_name="Jane",
            last_name="Smith",
            email="jane@academy2.com"
        )
        Student.objects.create(
            academy=self.academy2,
            parent=parent2,
            first_name="Bob",
            last_name="Smith"
        )
        
        # Academy1 admin should not see academy2 student
        request = self._create_request('get', '/api/v1/tenant/students/')
        viewset = StudentViewSet.as_view({'get': 'list'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)
    
    def test_soft_delete(self):
        """Test soft delete functionality."""
        student = Student.objects.create(
            academy=self.academy1,
            parent=self.parent,
            first_name="Jane",
            last_name="Doe"
        )
        
        request = self._create_request('delete', f'/api/v1/tenant/students/{student.id}/')
        viewset = StudentViewSet.as_view({'delete': 'destroy'})
        response = viewset(request, pk=student.id)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Student should still exist but be inactive
        student.refresh_from_db()
        self.assertFalse(student.is_active)


class ParentViewSetInviteTest(TestCase):
    """Test POST /api/v1/tenant/parents/{id}/invite/."""

    def setUp(self):
        self.client = APIClient()
        self.academy = Academy.objects.create(
            name='Invite Academy',
            slug='invite-academy',
            email='invite-academy@test.com',
            onboarding_completed=True,
        )
        self.plan = Plan.objects.create(
            name='Basic Plan',
            slug='basic-plan-invite',
            limits_json={
                'max_students': 100,
                'max_coaches': 10,
                'max_admins': 5,
                'max_classes': 50,
            },
        )
        Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now(),
        )
        self.admin = User.objects.create_user(
            email='admin-invite@academy.com',
            role=User.Role.ADMIN,
            academy=self.academy,
            is_active=True,
            is_verified=True,
        )
        from tenant.users.models import AdminProfile

        if not hasattr(self.admin, 'admin_profile'):
            AdminProfile.objects.create(user=self.admin, academy=self.academy)
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        self.guardian = Parent.objects.create(
            academy=self.academy,
            first_name='Guard',
            last_name='Ian',
            email='guardian.invite@example.com',
            phone='+10000000001',
        )

    @patch('tenant.users.services.UserService.send_invite_email_async')
    def test_invite_guardian_creates_parent_user(self, _mock_send):
        url = f'/api/v1/tenant/parents/{self.guardian.id}/invite/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data.get('invite_sent'))
        self.assertEqual(response.data['email'], 'guardian.invite@example.com')
        self.assertEqual(response.data['role'], 'PARENT')
        user = User.objects.get(email='guardian.invite@example.com')
        self.assertEqual(user.first_name, 'Guard')
        self.assertEqual(user.last_name, 'Ian')
        self.assertEqual(user.parent_profile.phone, '+10000000001')

    @patch('tenant.users.services.UserService.send_invite_email_async')
    def test_invite_guardian_fails_if_user_exists(self, _mock_send):
        from tenant.users.models import ParentProfile

        existing = User.objects.create_user(
            email='guardian.invite@example.com',
            role=User.Role.PARENT,
            academy=self.academy,
            is_active=False,
            is_verified=False,
        )
        ParentProfile.objects.create(user=existing, academy=self.academy, phone='')
        url = f'/api/v1/tenant/parents/{self.guardian.id}/invite/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
