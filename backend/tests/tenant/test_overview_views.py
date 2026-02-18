"""
Tests for Tenant Overview API endpoints.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from saas_platform.tenants.models import Academy
from tenant.users.models import User as TenantUser
from tenant.classes.models import Class
from tenant.attendance.models import Attendance
from tenant.billing.models import Invoice
from tenant.students.models import Student, Parent
from tenant.coaches.models import Coach
from django.utils import timezone
from datetime import date, timedelta

User = get_user_model()


class OverviewViewTest(TestCase):
    """Test Tenant Overview API endpoint."""
    
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
        
        # Create coach user
        self.coach_user = TenantUser.objects.create_user(
            email='coach@example.com',
            password='testpass123',
            role=TenantUser.Role.COACH,
            academy=self.academy,
            is_active=True
        )
        
        # Create coach profile
        self.coach = Coach.objects.create(
            academy=self.academy,
            user=self.coach_user,
            first_name='John',
            last_name='Coach',
            email='coach@example.com',
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
        
        # Create class
        self.class_obj = Class.objects.create(
            academy=self.academy,
            coach=self.coach,
            name='Test Class',
            is_active=True,
            start_date=date.today()
        )
        
        # Create attendance
        Attendance.objects.create(
            academy=self.academy,
            student=self.student,
            class_obj=self.class_obj,
            date=date.today(),
            status=Attendance.Status.PRESENT
        )
    
    def test_get_overview_admin(self):
        """Test getting overview as admin."""
        self.client.force_authenticate(user=self.admin)
        # Set academy context
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        
        response = self.client.get('/api/v1/tenant/overview/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'ADMIN')
        self.assertIn('today_classes', response.data)
        self.assertIn('attendance_summary', response.data)
        self.assertIn('finance_summary', response.data)
        self.assertIn('alerts', response.data)
    
    def test_get_overview_coach(self):
        """Test getting overview as coach."""
        self.client.force_authenticate(user=self.coach_user)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        
        response = self.client.get('/api/v1/tenant/overview/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'COACH')
        self.assertIn('today_classes', response.data)
    
    def test_get_overview_parent(self):
        """Test getting overview as parent."""
        self.client.force_authenticate(user=self.parent_user)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        
        response = self.client.get('/api/v1/tenant/overview/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'PARENT')
        self.assertIn('today_classes', response.data)
        self.assertIn('finance_summary', response.data)
    
    def test_get_overview_no_academy_context(self):
        """Test that overview requires academy context."""
        self.client.force_authenticate(user=self.admin)
        # Don't set academy context (no X-Academy-ID header)
        
        response = self.client.get('/api/v1/tenant/overview/')
        
        # May return 400 (academy context required) or 403 (permission denied)
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN])
