"""API tests for rent pay schedules (RA.3)."""
from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from saas_platform.tenants.models import Academy
from tenant.facilities.models import RentInvoice, RentPaySchedule, RentPayScheduleRun
from tenant.onboarding.models import Location

User = get_user_model()


class RentPayScheduleAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.academy = Academy.objects.create(
            name='API Academy',
            slug='api-academy',
            email='api@academy.test',
            currency='AED',
            onboarding_completed=True,
        )
        self.other_academy = Academy.objects.create(
            name='Other',
            slug='other-academy',
            email='o@academy.test',
            onboarding_completed=True,
        )
        self.location = Location.objects.create(academy=self.academy, name='Court')
        self.other_location = Location.objects.create(academy=self.other_academy, name='Elsewhere')

        plan = Plan.objects.create(name='Basic', slug='basic', limits_json={'max_students': 100})
        Subscription.objects.create(
            academy=self.academy,
            plan=plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now(),
        )

        self.admin = User.objects.create_user(
            email='admin@api.test',
            password='pass',
            role='ADMIN',
            academy=self.academy,
            is_active=True,
        )
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

    def _monthly_payload(self, **kwargs):
        base = {
            'location': self.location.id,
            'billing_type': RentPaySchedule.BillingType.MONTHLY,
            'amount': '1000.00',
            'currency': 'AED',
            'billing_day': 10,
            'cycle_start_date': '2026-01-01',
            'is_active': True,
        }
        base.update(kwargs)
        return base

    def test_list_scoped_to_academy(self):
        RentPaySchedule.objects.create(
            academy=self.academy,
            location=self.location,
            billing_type=RentPaySchedule.BillingType.MONTHLY,
            amount=Decimal('1.00'),
            currency='AED',
            billing_day=5,
            cycle_start_date=date(2026, 1, 1),
        )
        RentPaySchedule.objects.create(
            academy=self.other_academy,
            location=self.other_location,
            billing_type=RentPaySchedule.BillingType.MONTHLY,
            amount=Decimal('2.00'),
            currency='AED',
            billing_day=5,
            cycle_start_date=date(2026, 1, 1),
        )
        r = self.client.get('/api/v1/tenant/facilities/rent-pay-schedules/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data.get('results', r.data)), 1)

    def test_create_validates_billing_rules(self):
        r = self.client.post(
            '/api/v1/tenant/facilities/rent-pay-schedules/',
            {
                'location': self.location.id,
                'billing_type': RentPaySchedule.BillingType.MONTHLY,
                'amount': '100.00',
                'currency': 'AED',
                'cycle_start_date': '2026-01-01',
            },
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        details = r.data.get('details', r.data)
        self.assertIn('billing_day', details)

    def test_create_and_patch(self):
        c = self.client.post(
            '/api/v1/tenant/facilities/rent-pay-schedules/',
            self._monthly_payload(),
            format='json',
        )
        self.assertEqual(c.status_code, status.HTTP_201_CREATED)
        sid = c.data['id']
        p = self.client.patch(
            f'/api/v1/tenant/facilities/rent-pay-schedules/{sid}/',
            {'amount': '1200.00'},
            format='json',
        )
        self.assertEqual(p.status_code, status.HTTP_200_OK)
        self.assertEqual(p.data['amount'], '1200.00')

    def test_toggle_active(self):
        s = RentPaySchedule.objects.create(
            academy=self.academy,
            location=self.location,
            billing_type=RentPaySchedule.BillingType.MONTHLY,
            amount=Decimal('500.00'),
            currency='AED',
            billing_day=12,
            cycle_start_date=date(2026, 1, 1),
            is_active=True,
        )
        r = self.client.post(f'/api/v1/tenant/facilities/rent-pay-schedules/{s.id}/toggle-active/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertFalse(r.data['is_active'])

    def test_manual_run_returns_summary(self):
        s = RentPaySchedule.objects.create(
            academy=self.academy,
            location=self.location,
            billing_type=RentPaySchedule.BillingType.DAILY,
            amount=Decimal('50.00'),
            currency='AED',
            cycle_start_date=timezone.localdate(),
            is_active=True,
        )
        r = self.client.post(f'/api/v1/tenant/facilities/rent-pay-schedules/{s.id}/run/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('invoices_created', r.data)
        self.assertIn('status', r.data)
        self.assertIn('run_at', r.data)

    def test_run_history_paginated(self):
        s = RentPaySchedule.objects.create(
            academy=self.academy,
            location=self.location,
            billing_type=RentPaySchedule.BillingType.DAILY,
            amount=Decimal('50.00'),
            currency='AED',
            cycle_start_date=timezone.localdate(),
            is_active=True,
        )
        RentPayScheduleRun.objects.create(
            schedule=s,
            invoices_created=0,
            status=RentPayScheduleRun.RunStatus.SUCCEEDED,
        )
        r = self.client.get(f'/api/v1/tenant/facilities/rent-pay-schedules/{s.id}/runs/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('results', r.data)

    def test_pending_approvals_and_filters(self):
        sched = RentPaySchedule.objects.create(
            academy=self.academy,
            location=self.location,
            billing_type=RentPaySchedule.BillingType.MONTHLY,
            amount=Decimal('800.00'),
            currency='AED',
            billing_day=1,
            cycle_start_date=date(2026, 1, 1),
        )
        RentInvoice.objects.create(
            academy=self.academy,
            location=self.location,
            invoice_number='RINV-api-academy-2026-501',
            amount=Decimal('800.00'),
            currency='AED',
            period_description='Test draft',
            status=RentInvoice.Status.DRAFT,
            schedule=sched,
        )
        r = self.client.get('/api/v1/tenant/facilities/rent/pending-approvals/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data.get('results', r.data)), 1)
        f = self.client.get(
            f'/api/v1/tenant/facilities/rent/pending-approvals/?billing_type={RentPaySchedule.BillingType.MONTHLY}'
        )
        self.assertEqual(f.status_code, status.HTTP_200_OK)

    def test_bulk_issue(self):
        sched = RentPaySchedule.objects.create(
            academy=self.academy,
            location=self.location,
            billing_type=RentPaySchedule.BillingType.DAILY,
            amount=Decimal('100.00'),
            currency='AED',
            cycle_start_date=date(2026, 1, 1),
        )
        inv = RentInvoice.objects.create(
            academy=self.academy,
            location=self.location,
            invoice_number='RINV-api-academy-2026-601',
            amount=Decimal('100.00'),
            currency='AED',
            period_description='Bulk',
            status=RentInvoice.Status.DRAFT,
            schedule=sched,
        )
        r = self.client.post(
            '/api/v1/tenant/facilities/rent/bulk-issue/',
            {'invoice_ids': [inv.id]},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['issued_count'], 1)
        inv.refresh_from_db()
        self.assertEqual(inv.status, RentInvoice.Status.PENDING)

    def test_bulk_issue_non_draft_400(self):
        sched = RentPaySchedule.objects.create(
            academy=self.academy,
            location=self.location,
            billing_type=RentPaySchedule.BillingType.DAILY,
            amount=Decimal('100.00'),
            currency='AED',
            cycle_start_date=date(2026, 1, 1),
        )
        inv = RentInvoice.objects.create(
            academy=self.academy,
            location=self.location,
            invoice_number='RINV-api-academy-2026-602',
            amount=Decimal('100.00'),
            currency='AED',
            period_description='Pending',
            status=RentInvoice.Status.PENDING,
            schedule=sched,
        )
        r = self.client.post(
            '/api/v1/tenant/facilities/rent/bulk-issue/',
            {'invoice_ids': [inv.id]},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bulk_issue_other_academy_404(self):
        sched = RentPaySchedule.objects.create(
            academy=self.other_academy,
            location=self.other_location,
            billing_type=RentPaySchedule.BillingType.DAILY,
            amount=Decimal('100.00'),
            currency='AED',
            cycle_start_date=date(2026, 1, 1),
        )
        inv = RentInvoice.objects.create(
            academy=self.other_academy,
            location=self.other_location,
            invoice_number='RINV-other-2026-001',
            amount=Decimal('100.00'),
            currency='AED',
            period_description='X',
            status=RentInvoice.Status.DRAFT,
            schedule=sched,
        )
        r = self.client.post(
            '/api/v1/tenant/facilities/rent/bulk-issue/',
            {'invoice_ids': [inv.id]},
            format='json',
        )
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
