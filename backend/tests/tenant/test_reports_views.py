"""
Tests for Tenant Reports API endpoints.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from saas_platform.tenants.models import Academy
from tenant.users.models import User as TenantUser
from tenant.classes.models import Class, Enrollment
from tenant.attendance.models import Attendance
from tenant.billing.models import Invoice, Receipt
from tenant.facilities.models import Bill, InventoryItem, RentInvoice, RentPayment
from tenant.onboarding.models import Location
from tenant.students.models import Student, Parent
from tenant.coaches.models import Coach
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

User = get_user_model()


class ReportsViewTest(TestCase):
    """Test Tenant Reports API endpoint."""
    
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
        
        # Create parent and student
        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name='Jane',
            last_name='Parent',
            email='parent@example.com'
        )
        
        self.student = Student.objects.create(
            academy=self.academy,
            parent=self.parent,
            first_name='Child',
            last_name='Student',
            is_active=True
        )
        
        # Create coach
        self.coach = Coach.objects.create(
            academy=self.academy,
            first_name='John',
            last_name='Coach',
            email='coach@example.com',
            is_active=True
        )
        
        # Create class
        self.class_obj = Class.objects.create(
            academy=self.academy,
            coach=self.coach,
            name='Test Class',
            is_active=True
        )
        
        # Create enrollment
        Enrollment.objects.create(
            academy=self.academy,
            student=self.student,
            class_obj=self.class_obj,
            status=Enrollment.Status.ENROLLED
        )
        
        # Create attendance
        Attendance.objects.create(
            academy=self.academy,
            student=self.student,
            class_obj=self.class_obj,
            date=date.today(),
            status=Attendance.Status.PRESENT
        )
        
        # Create invoice
        self.invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number='INV-001',
            status=Invoice.Status.SENT,
            subtotal=Decimal('100.00'),
            total=Decimal('100.00'),
            due_date=date.today() + timedelta(days=30)
        )
    
    def test_get_attendance_report_admin(self):
        """Test getting attendance report as admin."""
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        
        response = self.client.get('/api/v1/tenant/reports/?report_type=attendance')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['type'], 'attendance')
        self.assertIn('summary', response.data)
        self.assertIn('by_class', response.data)
        self.assertIn('by_student', response.data)
    
    def test_get_financial_report_admin(self):
        """Test getting financial report as admin."""
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        
        response = self.client.get('/api/v1/tenant/reports/?report_type=financial')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['type'], 'financial')
        self.assertIn('summary', response.data)
        self.assertIn('invoices_by_status', response.data)
    
    def test_get_enrollment_report_admin(self):
        """Test getting enrollment report as admin."""
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        
        response = self.client.get('/api/v1/tenant/reports/?report_type=enrollment')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['type'], 'enrollment')
        self.assertIn('summary', response.data)
        self.assertIn('by_class', response.data)
    
    def test_get_report_with_date_filter(self):
        """Test getting report with date filter."""
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        
        date_from = (date.today() - timedelta(days=7)).isoformat()
        date_to = date.today().isoformat()
        
        response = self.client.get(
            f'/api/v1/tenant/reports/?report_type=attendance&date_from={date_from}&date_to={date_to}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data['date_from'])
        self.assertIsNotNone(response.data['date_to'])
    
    def test_get_report_invalid_type(self):
        """Test getting report with invalid type."""
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        
        response = self.client.get('/api/v1/tenant/reports/?report_type=invalid')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_get_report_no_academy_context(self):
        """Test that report requires academy context."""
        self.client.force_authenticate(user=self.admin)
        # Don't set academy context
        
        response = self.client.get('/api/v1/tenant/reports/?report_type=attendance')
        
        # Should fail due to missing academy context or permission
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN])

    def test_get_academy_financials_report_admin(self):
        """Test getting academy financials report as admin."""
        location = Location.objects.create(
            academy=self.academy,
            name='Main Facility',
        )
        rent_invoice = RentInvoice.objects.create(
            academy=self.academy,
            location=location,
            invoice_number='RINV-001',
            amount=Decimal('1000.00'),
            period_description='January 2026',
            status=RentInvoice.Status.PENDING,
        )
        RentPayment.objects.create(
            rent_invoice=rent_invoice,
            amount=Decimal('400.00'),
            payment_method='CARD',
            payment_date=date.today(),
        )
        Bill.objects.create(
            academy=self.academy,
            vendor_name='Sports Supply',
            bill_number='BILL-001',
            total_amount=Decimal('250.00'),
            status=Bill.Status.PAID,
            bill_date=date.today(),
        )
        InventoryItem.objects.create(
            academy=self.academy,
            name='Balls',
            quantity=12,
            unit='pcs',
        )

        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        response = self.client.get('/api/v1/tenant/reports/?report_type=academy_financials')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['type'], 'academy_financials')
        self.assertIn('summary', response.data)
        self.assertIn('rent_by_location', response.data)
        self.assertIn('bills_by_status', response.data)
        self.assertIn('inventory_summary', response.data)

    def test_get_finance_overview_report_admin(self):
        """Test getting finance overview report as admin."""
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        response = self.client.get('/api/v1/tenant/reports/?report_type=finance_overview')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['type'], 'finance_overview')
        self.assertIn('student', response.data)
        self.assertIn('rent', response.data)
        self.assertIn('staff', response.data)
        self.assertIn('summary', response.data['student'])
        self.assertIn('summary', response.data['rent'])
        self.assertIn('summary', response.data['staff'])
        self.assertIn('expected_total', response.data['staff']['summary'])
        self.assertIn('paid_total', response.data['staff']['summary'])
        self.assertIn('pending_total', response.data['staff']['summary'])
