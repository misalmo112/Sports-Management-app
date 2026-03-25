"""
Tests for Tenant Complaints API endpoints.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from saas_platform.tenants.models import Academy
from tenant.users.models import User as TenantUser
from tenant.communication.models import Feedback, FeedbackStatus, FeedbackPriority
from tenant.students.models import Student, Parent

User = get_user_model()


class ComplaintViewSetTest(TestCase):
    """Test ComplaintViewSet API endpoints."""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create academy
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com',
            onboarding_completed=True
        )
        
        # Create admin user
        self.admin = TenantUser.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            role=TenantUser.Role.ADMIN,
            academy=self.academy,
            is_active=True
        )
        
        # Create parent user
        self.parent_user = TenantUser.objects.create_user(
            email='parent@example.com',
            password='testpass123',
            role=TenantUser.Role.PARENT,
            academy=self.academy,
            is_active=True
        )
        
        # Create parent profile
        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name='Jane',
            last_name='Parent',
            email='parent@example.com'
        )
        
        # Create student
        self.student = Student.objects.create(
            academy=self.academy,
            parent=self.parent,
            first_name='Child',
            last_name='Student',
            is_active=True
        )
        
        # Create complaint
        self.feedback = Feedback.objects.create(
            academy=self.academy,
            parent=self.parent_user,
            student=self.student,
            subject='Test Complaint',
            message='This is a test complaint',
            status=FeedbackStatus.PENDING,
            priority=FeedbackPriority.MEDIUM
        )
    
    def test_create_complaint_parent(self):
        """Test creating complaint as parent."""
        self.client.force_authenticate(user=self.parent_user)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        
        data = {
            'student': self.student.id,
            'subject': 'New Complaint',
            'message': 'This is a new complaint',
            'priority': FeedbackPriority.HIGH
        }
        
        response = self.client.post('/api/v1/tenant/feedback/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['subject'], 'New Complaint')
        self.assertEqual(response.data['status'], FeedbackStatus.PENDING)

    def test_create_feedback_parent_without_student(self):
        """General feedback may omit student (null)."""
        self.client.force_authenticate(user=self.parent_user)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

        data = {
            'subject': 'General note',
            'message': 'Not tied to a specific child',
            'priority': FeedbackPriority.LOW,
        }

        response = self.client.post('/api/v1/tenant/feedback/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['subject'], 'General note')
        self.assertIsNone(response.data['student'])
    
    def test_create_complaint_non_parent(self):
        """Test that non-parent cannot create complaint."""
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        
        data = {
            'subject': 'New Complaint',
            'message': 'This is a new complaint'
        }
        
        response = self.client.post('/api/v1/tenant/feedback/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_list_complaints_admin(self):
        """Test listing complaints as admin."""
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        
        response = self.client.get('/api/v1/tenant/feedback/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)
    
    def test_list_complaints_parent(self):
        """Test that parent cannot list complaints."""
        self.client.force_authenticate(user=self.parent_user)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        
        response = self.client.get('/api/v1/tenant/feedback/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_retrieve_complaint_admin(self):
        """Test retrieving complaint details as admin."""
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        
        response = self.client.get(f'/api/v1/tenant/feedback/{self.feedback.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['subject'], 'Test Complaint')
    
    def test_update_complaint_admin(self):
        """Test updating complaint as admin."""
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        
        data = {
            'status': FeedbackStatus.IN_PROGRESS,
            'priority': FeedbackPriority.HIGH,
            'assigned_to': self.admin.id
        }
        
        response = self.client.patch(f'/api/v1/tenant/feedback/{self.feedback.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], FeedbackStatus.IN_PROGRESS)
        self.assertEqual(response.data['priority'], FeedbackPriority.HIGH)
    
    def test_resolve_complaint_admin(self):
        """Test resolving complaint as admin."""
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        
        data = {
            'status': FeedbackStatus.RESOLVED,
            'resolution_notes': 'Issue has been resolved'
        }
        
        response = self.client.patch(f'/api/v1/tenant/feedback/{self.feedback.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], FeedbackStatus.RESOLVED)
        self.assertIsNotNone(response.data['resolved_at'])
        self.assertEqual(response.data['resolution_notes'], 'Issue has been resolved')
    
    def test_filter_complaints_by_status(self):
        """Test filtering complaints by status."""
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        
        response = self.client.get('/api/v1/tenant/feedback/?status=PENDING')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # All returned complaints should have PENDING status
        for complaint in response.data['results']:
            self.assertEqual(complaint['status'], FeedbackStatus.PENDING)
    
    def test_filter_complaints_by_priority(self):
        """Test filtering complaints by priority."""
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        
        response = self.client.get('/api/v1/tenant/feedback/?priority=MEDIUM')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # All returned complaints should have MEDIUM priority
        for complaint in response.data['results']:
            self.assertEqual(complaint['priority'], FeedbackPriority.MEDIUM)
