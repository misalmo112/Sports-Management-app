from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework import status
from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from tenant.students.models import Parent, Student
from tenant.coaches.models import Coach
from tenant.classes.models import Class
from tenant.attendance.models import Attendance, CoachAttendance
from tenant.attendance.views import AttendanceViewSet, CoachAttendanceViewSet
from django.utils import timezone
from datetime import date

User = get_user_model()


class AttendanceViewSetTest(TestCase):
    """Test AttendanceViewSet API endpoints."""
    
    def setUp(self):
        self.factory = APIRequestFactory()
        
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
        
        self.plan = Plan.objects.create(
            name="Basic Plan",
            slug="basic-plan",
            limits_json={
                'max_students': 100,
                'max_coaches': 50,
                'max_classes': 200
            }
        )
        self.subscription = Subscription.objects.create(
            academy=self.academy1,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )
        
        # Create admin user
        self.admin = User.objects.create_user(
            email='admin@academy1.com',
            password='testpass123',
            role='ADMIN',
            academy=self.academy1
        )
        
        # Create coach user
        self.coach_user = User.objects.create_user(
            email='coach@academy1.com',
            password='testpass123',
            role='COACH',
            academy=self.academy1
        )
        
        # Create coach
        self.coach = Coach.objects.create(
            academy=self.academy1,
            first_name="Mike",
            last_name="Coach",
            email="mike@test.com",
            user=self.coach_user
        )
        
        # Create parent and students
        self.parent = Parent.objects.create(
            academy=self.academy1,
            first_name="John",
            last_name="Doe",
            email="john@test.com"
        )
        self.student1 = Student.objects.create(
            academy=self.academy1,
            parent=self.parent,
            first_name="Jane",
            last_name="Doe"
        )
        self.student2 = Student.objects.create(
            academy=self.academy1,
            parent=self.parent,
            first_name="Bob",
            last_name="Doe"
        )
        
        # Create class
        self.class_obj = Class.objects.create(
            academy=self.academy1,
            name="Soccer Training",
            max_capacity=20,
            coach=self.coach
        )
    
    def _create_request(self, method='get', path='/', data=None, user=None):
        """Helper to create request with academy context."""
        if user is None:
            user = self.admin
        
        if method == 'get':
            request = self.factory.get(path)
        elif method == 'post':
            request = self.factory.post(path, data, format='json')
        elif method == 'patch':
            request = self.factory.patch(path, data, format='json')
        elif method == 'delete':
            request = self.factory.delete(path)
        else:
            request = self.factory.get(path)
        
        request.user = user
        request.academy = self.academy1
        force_authenticate(request, user=user)
        return request
    
    def test_list_attendance_admin(self):
        """Test admin can list all attendance records."""
        # Create some attendance records
        Attendance.objects.create(
            academy=self.academy1,
            student=self.student1,
            class_obj=self.class_obj,
            date=date.today(),
            status=Attendance.Status.PRESENT
        )
        
        request = self._create_request('get', '/api/v1/tenant/attendance/')
        viewset = AttendanceViewSet.as_view({'get': 'list'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_list_attendance_coach_filtered(self):
        """Test coach can only see attendance for their assigned classes."""
        # Create class for another coach
        coach2 = Coach.objects.create(
            academy=self.academy1,
            first_name="Other",
            last_name="Coach",
            email="other@test.com"
        )
        class2 = Class.objects.create(
            academy=self.academy1,
            name="Basketball Training",
            max_capacity=20,
            coach=coach2
        )
        
        # Create attendance for both classes
        Attendance.objects.create(
            academy=self.academy1,
            student=self.student1,
            class_obj=self.class_obj,
            date=date.today(),
            status=Attendance.Status.PRESENT
        )
        Attendance.objects.create(
            academy=self.academy1,
            student=self.student1,
            class_obj=class2,
            date=date.today(),
            status=Attendance.Status.PRESENT
        )
        
        request = self._create_request('get', '/api/v1/tenant/attendance/', user=self.coach_user)
        viewset = AttendanceViewSet.as_view({'get': 'list'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Coach should only see attendance for their class
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['class_name'], self.class_obj.name)
    
    def test_mark_attendance_bulk(self):
        """Test bulk marking attendance."""
        attendance_date = date.today()
        data = {
            'class_id': self.class_obj.id,
            'date': attendance_date.isoformat(),
            'attendance_records': [
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
        }
        
        request = self._create_request('post', '/api/v1/tenant/attendance/mark/', data=data)
        viewset = AttendanceViewSet.as_view({'post': 'mark'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('message', response.data)
        self.assertEqual(len(response.data['attendance_records']), 2)
        
        # Verify attendances were created
        count = Attendance.objects.filter(
            class_obj=self.class_obj,
            date=attendance_date
        ).count()
        self.assertEqual(count, 2)
    
    def test_mark_attendance_coach_permission(self):
        """Test coach can mark attendance for their assigned classes."""
        attendance_date = date.today()
        data = {
            'class_id': self.class_obj.id,
            'date': attendance_date.isoformat(),
            'attendance_records': [
                {
                    'student_id': self.student1.id,
                    'status': Attendance.Status.PRESENT
                }
            ]
        }
        
        request = self._create_request('post', '/api/v1/tenant/attendance/mark/', data=data, user=self.coach_user)
        viewset = AttendanceViewSet.as_view({'post': 'mark'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_mark_attendance_coach_unauthorized_class(self):
        """Test coach cannot mark attendance for classes they're not assigned to."""
        # Create class for another coach
        coach2 = Coach.objects.create(
            academy=self.academy1,
            first_name="Other",
            last_name="Coach",
            email="other@test.com"
        )
        class2 = Class.objects.create(
            academy=self.academy1,
            name="Basketball Training",
            max_capacity=20,
            coach=coach2
        )
        
        attendance_date = date.today()
        data = {
            'class_id': class2.id,
            'date': attendance_date.isoformat(),
            'attendance_records': [
                {
                    'student_id': self.student1.id,
                    'status': Attendance.Status.PRESENT
                }
            ]
        }
        
        request = self._create_request('post', '/api/v1/tenant/attendance/mark/', data=data, user=self.coach_user)
        viewset = AttendanceViewSet.as_view({'post': 'mark'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_monthly_summary(self):
        """Test getting monthly summary."""
        # Create attendance records for January 2024
        dates = [
            date(2024, 1, 5),
            date(2024, 1, 10),
            date(2024, 1, 15),
        ]
        
        for attendance_date in dates:
            Attendance.objects.create(
                academy=self.academy1,
                student=self.student1,
                class_obj=self.class_obj,
                date=attendance_date,
                status=Attendance.Status.PRESENT
            )
        
        request = self._create_request('get', '/api/v1/tenant/attendance/monthly-summary/?year=2024&month=1')
        viewset = AttendanceViewSet.as_view({'get': 'monthly_summary'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['year'], 2024)
        self.assertEqual(response.data['month'], 1)
        self.assertIn('summaries', response.data)
        self.assertIn('academy_summary', response.data)
    
    def test_export_csv(self):
        """Test exporting attendance to CSV."""
        # Create some attendance records
        Attendance.objects.create(
            academy=self.academy1,
            student=self.student1,
            class_obj=self.class_obj,
            date=date(2024, 1, 5),
            status=Attendance.Status.PRESENT,
            marked_by=self.admin
        )
        
        request = self._create_request('get', '/api/v1/tenant/attendance/export/?start_date=2024-01-01&end_date=2024-01-31')
        viewset = AttendanceViewSet.as_view({'get': 'export'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv')
        self.assertIn('attachment', response['Content-Disposition'])
    
    def test_create_attendance_record(self):
        """Test creating a single attendance record."""
        data = {
            'student': self.student1.id,
            'class_obj': self.class_obj.id,
            'date': date.today().isoformat(),
            'status': Attendance.Status.PRESENT,
            'notes': 'Test note'
        }
        
        request = self._create_request('post', '/api/v1/tenant/attendance/', data=data)
        viewset = AttendanceViewSet.as_view({'post': 'create'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], Attendance.Status.PRESENT)
        
        # Verify attendance was created
        attendance = Attendance.objects.get(
            student=self.student1,
            class_obj=self.class_obj,
            date=date.today()
        )
        self.assertEqual(attendance.status, Attendance.Status.PRESENT)
    
    def test_tenant_isolation(self):
        """Test attendance records are isolated by academy."""
        # Create attendance in academy1
        Attendance.objects.create(
            academy=self.academy1,
            student=self.student1,
            class_obj=self.class_obj,
            date=date.today(),
            status=Attendance.Status.PRESENT
        )
        
        # Create student and class in academy2
        parent2 = Parent.objects.create(
            academy=self.academy2,
            first_name="Jane",
            last_name="Smith",
            email="jane@test.com"
        )
        student2 = Student.objects.create(
            academy=self.academy2,
            parent=parent2,
            first_name="Alice",
            last_name="Smith"
        )
        class2 = Class.objects.create(
            academy=self.academy2,
            name="Basketball Training",
            max_capacity=20
        )
        Attendance.objects.create(
            academy=self.academy2,
            student=student2,
            class_obj=class2,
            date=date.today(),
            status=Attendance.Status.PRESENT
        )
        
        # Admin from academy1 should only see academy1 attendance
        request = self._create_request('get', '/api/v1/tenant/attendance/')
        viewset = AttendanceViewSet.as_view({'get': 'list'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['student_name'], self.student1.full_name)
    
    def test_list_attendance_parent_filtered(self):
        """Test parent can only see attendance for their own children."""
        # Create parent user
        parent_user = User.objects.create_user(
            email='parent@academy1.com',
            password='testpass123',
            role='PARENT',
            academy=self.academy1
        )
        
        # Create another parent and student
        parent2 = Parent.objects.create(
            academy=self.academy1,
            first_name="Jane",
            last_name="Smith",
            email="jane@test.com"
        )
        student3 = Student.objects.create(
            academy=self.academy1,
            parent=parent2,
            first_name="Alice",
            last_name="Smith"
        )
        
        # Update parent to link to user
        self.parent.email = parent_user.email
        self.parent.save()
        
        # Create attendance for both parents' children
        Attendance.objects.create(
            academy=self.academy1,
            student=self.student1,
            class_obj=self.class_obj,
            date=date.today(),
            status=Attendance.Status.PRESENT
        )
        Attendance.objects.create(
            academy=self.academy1,
            student=student3,
            class_obj=self.class_obj,
            date=date.today(),
            status=Attendance.Status.PRESENT
        )
        
        request = self._create_request('get', '/api/v1/tenant/attendance/', user=parent_user)
        viewset = AttendanceViewSet.as_view({'get': 'list'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Parent should only see attendance for their own children
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['student_name'], self.student1.full_name)


class CoachAttendanceViewSetTest(TestCase):
    """Test CoachAttendanceViewSet API endpoints."""
    
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
                'max_students': 100,
                'max_coaches': 50,
                'max_classes': 200
            }
        )
        self.subscription = Subscription.objects.create(
            academy=self.academy1,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )
        
        # Create admin user
        self.admin = User.objects.create_user(
            email='admin@academy1.com',
            password='testpass123',
            role='ADMIN',
            academy=self.academy1
        )
        
        # Create coach user
        self.coach_user = User.objects.create_user(
            email='coach@academy1.com',
            password='testpass123',
            role='COACH',
            academy=self.academy1
        )
        
        # Create coach
        self.coach = Coach.objects.create(
            academy=self.academy1,
            first_name="Mike",
            last_name="Coach",
            email="mike@test.com",
            user=self.coach_user
        )
        
        # Create class
        self.class_obj = Class.objects.create(
            academy=self.academy1,
            name="Soccer Training",
            max_capacity=20,
            coach=self.coach
        )
    
    def _create_request(self, method='get', path='/', data=None, user=None):
        """Helper to create request with academy context."""
        if user is None:
            user = self.admin
        
        if method == 'get':
            request = self.factory.get(path)
        elif method == 'post':
            request = self.factory.post(path, data, format='json')
        else:
            request = self.factory.get(path)
        
        request.user = user
        request.academy = self.academy1
        force_authenticate(request, user=user)
        return request
    
    def test_mark_coach_attendance(self):
        """Test marking coach attendance."""
        attendance_date = date.today()
        data = {
            'class_id': self.class_obj.id,
            'coach_id': self.coach.id,
            'date': attendance_date.isoformat(),
            'status': CoachAttendance.Status.PRESENT,
            'notes': 'On time'
        }
        
        request = self._create_request('post', '/api/v1/tenant/attendance/coach-attendance/mark/', data=data)
        viewset = CoachAttendanceViewSet.as_view({'post': 'mark'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], CoachAttendance.Status.PRESENT)
        
        # Verify attendance was created
        attendance = CoachAttendance.objects.get(
            coach=self.coach,
            class_obj=self.class_obj,
            date=attendance_date
        )
        self.assertEqual(attendance.status, CoachAttendance.Status.PRESENT)
    
    def test_mark_coach_attendance_self(self):
        """Test coach can mark their own attendance."""
        attendance_date = date.today()
        data = {
            'class_id': self.class_obj.id,
            'coach_id': self.coach.id,
            'date': attendance_date.isoformat(),
            'status': CoachAttendance.Status.PRESENT
        }
        
        request = self._create_request('post', '/api/v1/tenant/attendance/coach-attendance/mark/', data=data, user=self.coach_user)
        viewset = CoachAttendanceViewSet.as_view({'post': 'mark'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_list_coach_attendance_coach_filtered(self):
        """Test coach can only see their own attendance."""
        # Create another coach
        coach2_user = User.objects.create_user(
            email='coach2@academy1.com',
            password='testpass123',
            role='COACH',
            academy=self.academy1
        )
        
        coach2 = Coach.objects.create(
            academy=self.academy1,
            first_name="Other",
            last_name="Coach",
            email="other@test.com",
            user=coach2_user
        )
        
        # Create attendance for both coaches
        CoachAttendance.objects.create(
            academy=self.academy1,
            coach=self.coach,
            class_obj=self.class_obj,
            date=date.today(),
            status=CoachAttendance.Status.PRESENT
        )
        CoachAttendance.objects.create(
            academy=self.academy1,
            coach=coach2,
            class_obj=self.class_obj,
            date=date.today(),
            status=CoachAttendance.Status.PRESENT
        )
        
        request = self._create_request('get', '/api/v1/tenant/attendance/coach-attendance/', user=self.coach_user)
        viewset = CoachAttendanceViewSet.as_view({'get': 'list'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Coach should only see their own attendance
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['coach_name'], self.coach.full_name)
    
    def test_export_coach_attendance_csv(self):
        """Test exporting coach attendance to CSV."""
        # Create some coach attendance records
        CoachAttendance.objects.create(
            academy=self.academy1,
            coach=self.coach,
            class_obj=self.class_obj,
            date=date(2024, 1, 5),
            status=CoachAttendance.Status.PRESENT,
            marked_by=self.admin
        )
        
        request = self._create_request('get', '/api/v1/tenant/attendance/coach-attendance/export/?start_date=2024-01-01&end_date=2024-01-31')
        viewset = CoachAttendanceViewSet.as_view({'get': 'export'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv')
        self.assertIn('attachment', response['Content-Disposition'])
