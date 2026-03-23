from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory
from rest_framework import status
from unittest.mock import patch
from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from tenant.coaches.models import Coach, StaffInvoice, StaffPaySchedule, StaffPayScheduleRun
from tenant.coaches.views import (
    CoachViewSet,
    StaffBulkIssueView,
    StaffPayScheduleViewSet,
    StaffPendingApprovalsView,
)
from django.utils import timezone

User = get_user_model()


class CoachViewSetTest(TestCase):
    """Test CoachViewSet API endpoints."""
    
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
    
    def test_create_coach_with_quota_check(self):
        """Test creating coach with quota enforcement."""
        # Create coaches up to quota limit
        for i in range(5):
            Coach.objects.create(
                academy=self.academy1,
                first_name=f"Coach{i}",
                last_name="Test",
                email=f"coach{i}@test.com"
            )
        
        # Try to create 6th coach (should fail)
        request = self._create_request('post', '/api/v1/tenant/coaches/', {
            'first_name': 'Coach6',
            'last_name': 'Test',
            'email': 'coach6@test.com'
        })
        viewset = CoachViewSet.as_view({'post': 'create'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('quota', response.data['detail'].lower())
    
    def test_tenant_isolation(self):
        """Test tenant isolation."""
        academy2 = Academy.objects.create(
            name="Academy 2",
            slug="academy-2",
            email="academy2@test.com",
            onboarding_completed=True
        )
        
        Coach.objects.create(
            academy=academy2,
            first_name="Coach",
            last_name="Other",
            email="coach@academy2.com"
        )
        
        request = self._create_request('get', '/api/v1/tenant/coaches/')
        viewset = CoachViewSet.as_view({'get': 'list'})
        response = viewset(request)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)


class StaffPayScheduleAPITest(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

        self.academy1 = Academy.objects.create(
            name="Academy One",
            slug="academy-one",
            email="academy1@test.com",
            onboarding_completed=True
        )
        self.academy2 = Academy.objects.create(
            name="Academy Two",
            slug="academy-two",
            email="academy2@test.com",
            onboarding_completed=True
        )

        self.plan = Plan.objects.create(
            name="Basic Plan 2",
            slug="basic-plan-2",
            limits_json={'max_students': 100, 'max_coaches': 100, 'max_classes': 100}
        )
        Subscription.objects.create(
            academy=self.academy1,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )
        Subscription.objects.create(
            academy=self.academy2,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )

        self.admin1 = User.objects.create_user(
            email='admin1@academy.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.academy1
        )
        self.admin2 = User.objects.create_user(
            email='admin2@academy.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.academy2
        )

        self.coach1 = Coach.objects.create(
            academy=self.academy1,
            first_name="Coach",
            last_name="One",
            email="coach1@test.com"
        )
        self.coach2 = Coach.objects.create(
            academy=self.academy2,
            first_name="Coach",
            last_name="Two",
            email="coach2@test.com"
        )

    def _request(self, user, academy, method='get', path='/', data=None, query_params=None):
        from rest_framework.test import force_authenticate

        if method == 'get':
            request = self.factory.get(path, data=query_params or {})
        elif method == 'post':
            request = self.factory.post(path, data or {}, format='json')
        elif method == 'patch':
            request = self.factory.patch(path, data or {}, format='json')
        else:
            request = self.factory.get(path)
        request.user = user
        request.academy = academy
        force_authenticate(request, user=user)
        return request

    def _create_schedule(self, academy, coach, billing_type=StaffPaySchedule.BillingType.MONTHLY):
        kwargs = {
            'academy': academy,
            'coach': coach,
            'billing_type': billing_type,
            'amount': '1000.00',
            'cycle_start_date': timezone.localdate(),
            'is_active': True,
        }
        if billing_type == StaffPaySchedule.BillingType.MONTHLY:
            kwargs['billing_day'] = 5
        elif billing_type == StaffPaySchedule.BillingType.WEEKLY:
            kwargs['billing_day_of_week'] = 2
        else:
            kwargs['sessions_per_cycle'] = 3
        return StaffPaySchedule.objects.create(**kwargs)

    def test_list_scoped_by_academy(self):
        self._create_schedule(self.academy1, self.coach1)
        self._create_schedule(self.academy2, self.coach2)

        request = self._request(self.admin1, self.academy1, method='get', path='/api/v1/tenant/coaches/staff-pay-schedules/')
        view = StaffPayScheduleViewSet.as_view({'get': 'list'})
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['coach'], self.coach1.id)

    def test_create_validates_billing_type_rules(self):
        request = self._request(
            self.admin1,
            self.academy1,
            method='post',
            path='/api/v1/tenant/coaches/staff-pay-schedules/',
            data={
                'coach': self.coach1.id,
                'billing_type': StaffPaySchedule.BillingType.MONTHLY,
                'amount': '900.00',
                'cycle_start_date': str(timezone.localdate()),
            }
        )
        view = StaffPayScheduleViewSet.as_view({'post': 'create'})
        response = view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('billing_day', str(response.data))

    def test_patch_updates_schedule(self):
        schedule = self._create_schedule(self.academy1, self.coach1, StaffPaySchedule.BillingType.MONTHLY)
        request = self._request(
            self.admin1,
            self.academy1,
            method='patch',
            path=f'/api/v1/tenant/coaches/staff-pay-schedules/{schedule.id}/',
            data={'amount': '1500.00'}
        )
        view = StaffPayScheduleViewSet.as_view({'patch': 'partial_update'})
        response = view(request, pk=schedule.id)
        schedule.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(schedule.amount), '1500.00')

    def test_toggle_active_flips(self):
        schedule = self._create_schedule(self.academy1, self.coach1)
        request = self._request(
            self.admin1, self.academy1, method='post',
            path=f'/api/v1/tenant/coaches/staff-pay-schedules/{schedule.id}/toggle-active/'
        )
        view = StaffPayScheduleViewSet.as_view({'post': 'toggle_active'})
        response = view(request, pk=schedule.id)
        schedule.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(schedule.is_active)

    @patch('tenant.coaches.views.evaluate_weekly_pay_schedules.delay')
    @patch('tenant.coaches.views.evaluate_monthly_pay_schedules.delay')
    @patch('tenant.coaches.views.evaluate_session_pay_schedules.delay')
    def test_run_endpoint_triggers_tasks_and_returns_summary(self, session_delay, monthly_delay, weekly_delay):
        schedule = self._create_schedule(self.academy1, self.coach1, StaffPaySchedule.BillingType.WEEKLY)
        request = self._request(
            self.admin1, self.academy1, method='post',
            path=f'/api/v1/tenant/coaches/staff-pay-schedules/{schedule.id}/run/'
        )
        view = StaffPayScheduleViewSet.as_view({'post': 'run'})
        response = view(request, pk=schedule.id)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        session_delay.assert_called_once_with(schedule_id=schedule.id)
        monthly_delay.assert_called_once_with(schedule_id=schedule.id)
        weekly_delay.assert_called_once_with(schedule_id=schedule.id)
        self.assertIn('invoices_created', response.data)
        self.assertIn('status', response.data)
        self.assertIn('run_at', response.data)

    def test_run_history_returns_runs(self):
        schedule = self._create_schedule(self.academy1, self.coach1)
        StaffPayScheduleRun.objects.create(
            schedule=schedule,
            invoices_created=1,
            status=StaffPayScheduleRun.RunStatus.SUCCEEDED,
            triggered_by=StaffPayScheduleRun.TriggerSource.MANUAL,
        )
        StaffPayScheduleRun.objects.create(
            schedule=schedule,
            invoices_created=0,
            status=StaffPayScheduleRun.RunStatus.FAILED,
            triggered_by=StaffPayScheduleRun.TriggerSource.SCHEDULED,
        )

        request = self._request(
            self.admin1, self.academy1, method='get',
            path=f'/api/v1/tenant/coaches/staff-pay-schedules/{schedule.id}/runs/'
        )
        view = StaffPayScheduleViewSet.as_view({'get': 'runs'})
        response = view(request, pk=schedule.id)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_pending_approvals_returns_only_schedule_generated_drafts(self):
        schedule = self._create_schedule(self.academy1, self.coach1, StaffPaySchedule.BillingType.MONTHLY)
        StaffInvoice.objects.create(
            academy=self.academy1,
            coach=self.coach1,
            schedule=schedule,
            invoice_number='INV-1',
            amount='100.00',
            currency='USD',
            period_description='Monthly',
            period_type=StaffInvoice.PeriodType.MONTH,
            period_start=timezone.localdate(),
            status=StaffInvoice.Status.DRAFT,
        )
        StaffInvoice.objects.create(
            academy=self.academy1,
            coach=self.coach1,
            schedule=None,
            invoice_number='INV-2',
            amount='100.00',
            currency='USD',
            period_description='Manual',
            period_type=StaffInvoice.PeriodType.MONTH,
            period_start=timezone.localdate(),
            status=StaffInvoice.Status.DRAFT,
        )
        StaffInvoice.objects.create(
            academy=self.academy1,
            coach=self.coach1,
            schedule=schedule,
            invoice_number='INV-3',
            amount='100.00',
            currency='USD',
            period_description='Pending',
            period_type=StaffInvoice.PeriodType.MONTH,
            period_start=timezone.localdate(),
            status=StaffInvoice.Status.PENDING,
        )

        request = self._request(
            self.admin1, self.academy1, method='get',
            path='/api/v1/tenant/coaches/staff/pending-approvals/'
        )
        response = StaffPendingApprovalsView.as_view()(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['invoice_number'], 'INV-1')

    def test_billing_type_filter_works(self):
        monthly = self._create_schedule(self.academy1, self.coach1, StaffPaySchedule.BillingType.MONTHLY)
        weekly = self._create_schedule(self.academy1, self.coach1, StaffPaySchedule.BillingType.WEEKLY)
        StaffInvoice.objects.create(
            academy=self.academy1,
            coach=self.coach1,
            schedule=monthly,
            invoice_number='INV-M',
            amount='100.00',
            currency='USD',
            period_description='Monthly',
            period_type=StaffInvoice.PeriodType.MONTH,
            period_start=timezone.localdate(),
            status=StaffInvoice.Status.DRAFT,
        )
        StaffInvoice.objects.create(
            academy=self.academy1,
            coach=self.coach1,
            schedule=weekly,
            invoice_number='INV-W',
            amount='100.00',
            currency='USD',
            period_description='Weekly',
            period_type=StaffInvoice.PeriodType.WEEK,
            period_start=timezone.localdate(),
            status=StaffInvoice.Status.DRAFT,
        )
        request = self._request(
            self.admin1,
            self.academy1,
            method='get',
            path='/api/v1/tenant/coaches/staff/pending-approvals/',
            query_params={'billing_type': StaffPaySchedule.BillingType.WEEKLY}
        )
        response = StaffPendingApprovalsView.as_view()(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['invoice_number'], 'INV-W')

    def test_bulk_issue_success_sets_pending_and_issued_date(self):
        schedule = self._create_schedule(self.academy1, self.coach1)
        inv1 = StaffInvoice.objects.create(
            academy=self.academy1,
            coach=self.coach1,
            schedule=schedule,
            invoice_number='INV-B1',
            amount='120.00',
            currency='USD',
            period_description='Monthly',
            period_type=StaffInvoice.PeriodType.MONTH,
            period_start=timezone.localdate(),
            status=StaffInvoice.Status.DRAFT,
        )
        inv2 = StaffInvoice.objects.create(
            academy=self.academy1,
            coach=self.coach1,
            schedule=schedule,
            invoice_number='INV-B2',
            amount='140.00',
            currency='USD',
            period_description='Monthly',
            period_type=StaffInvoice.PeriodType.MONTH,
            period_start=timezone.localdate(),
            status=StaffInvoice.Status.DRAFT,
        )
        request = self._request(
            self.admin1,
            self.academy1,
            method='post',
            path='/api/v1/tenant/coaches/staff/bulk-issue/',
            data={'invoice_ids': [inv1.id, inv2.id]}
        )
        response = StaffBulkIssueView.as_view()(request)
        inv1.refresh_from_db()
        inv2.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['issued_count'], 2)
        self.assertEqual(inv1.status, StaffInvoice.Status.PENDING)
        self.assertEqual(inv2.status, StaffInvoice.Status.PENDING)
        self.assertEqual(inv1.issued_date, timezone.localdate())
        self.assertEqual(inv2.issued_date, timezone.localdate())

    def test_bulk_issue_cross_academy_ids_denied(self):
        schedule1 = self._create_schedule(self.academy1, self.coach1)
        schedule2 = self._create_schedule(self.academy2, self.coach2)
        inv1 = StaffInvoice.objects.create(
            academy=self.academy1,
            coach=self.coach1,
            schedule=schedule1,
            invoice_number='INV-X1',
            amount='120.00',
            currency='USD',
            period_description='Monthly',
            period_type=StaffInvoice.PeriodType.MONTH,
            period_start=timezone.localdate(),
            status=StaffInvoice.Status.DRAFT,
        )
        inv2 = StaffInvoice.objects.create(
            academy=self.academy2,
            coach=self.coach2,
            schedule=schedule2,
            invoice_number='INV-X2',
            amount='120.00',
            currency='USD',
            period_description='Monthly',
            period_type=StaffInvoice.PeriodType.MONTH,
            period_start=timezone.localdate(),
            status=StaffInvoice.Status.DRAFT,
        )
        request = self._request(
            self.admin1,
            self.academy1,
            method='post',
            path='/api/v1/tenant/coaches/staff/bulk-issue/',
            data={'invoice_ids': [inv1.id, inv2.id]}
        )
        response = StaffBulkIssueView.as_view()(request)
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_bulk_issue_already_pending_returns_400(self):
        schedule = self._create_schedule(self.academy1, self.coach1)
        inv = StaffInvoice.objects.create(
            academy=self.academy1,
            coach=self.coach1,
            schedule=schedule,
            invoice_number='INV-P1',
            amount='120.00',
            currency='USD',
            period_description='Monthly',
            period_type=StaffInvoice.PeriodType.MONTH,
            period_start=timezone.localdate(),
            status=StaffInvoice.Status.PENDING,
        )
        request = self._request(
            self.admin1,
            self.academy1,
            method='post',
            path='/api/v1/tenant/coaches/staff/bulk-issue/',
            data={'invoice_ids': [inv.id]}
        )
        response = StaffBulkIssueView.as_view()(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
