from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.finance.models import BillingCycle, ExpenseCategory, OperationalExpense
from saas_platform.finance.services import FinanceService
from saas_platform.subscriptions.models import (
    PaymentMethod,
    Plan,
    PlatformPayment,
    Subscription,
    SubscriptionStatus,
)
from saas_platform.tenants.models import Academy


User = get_user_model()


class FinanceServiceTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.superadmin = User.objects.create_superuser(
            email='superadmin-finance@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            is_active=True,
        )
        self.admin_academy = self.create_academy('Finance Admin Academy', 'finance-admin-academy')
        self.admin = User.objects.create_user(
            email='finance-admin-user@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.admin_academy,
            is_active=True,
            is_superuser=False,
            is_staff=False,
        )

    def create_academy(self, name, slug):
        return Academy.objects.create(
            name=name,
            slug=slug,
            email=f'{slug}@example.com',
        )

    def create_plan(self, slug, **overrides):
        data = {
            'name': slug.replace('-', ' ').title(),
            'slug': slug,
            'currency': 'USD',
            'limits_json': {'max_students': 100, 'storage_bytes': 10737418240},
            'is_active': True,
            'is_public': True,
        }
        data.update(overrides)
        return Plan.objects.create(**data)

    def create_subscription(self, slug, plan, status, **overrides):
        academy = self.create_academy(f'{slug.title()} Academy', slug)
        data = {
            'academy': academy,
            'plan': plan,
            'status': status,
            'is_current': True,
            'start_at': timezone.now() - timedelta(days=30),
        }
        data.update(overrides)
        return Subscription.objects.create(**data)

    def create_payment(self, subscription, amount, payment_date):
        return PlatformPayment.objects.create(
            subscription=subscription,
            academy=subscription.academy,
            amount=amount,
            currency='USD',
            payment_method=PaymentMethod.CREDIT_CARD,
            payment_date=payment_date,
        )

    def create_paid_expense(self, category, amount, paid_date):
        return OperationalExpense.objects.create(
            category=category,
            vendor_name=f'{category.lower()}-vendor',
            amount=amount,
            currency='USD',
            billing_cycle=BillingCycle.MONTHLY,
            paid_date=paid_date,
            is_paid=True,
        )

    def test_mrr_counts_active_monthly_plans(self):
        plan = self.create_plan('active-monthly', price_monthly=Decimal('100.00'))
        self.create_subscription('active-monthly-academy', plan, SubscriptionStatus.ACTIVE)

        self.assertEqual(FinanceService.get_mrr(), Decimal('100.00'))

    def test_mrr_normalizes_yearly_plan(self):
        plan = self.create_plan('active-yearly', price_yearly=Decimal('1200.00'))
        self.create_subscription('active-yearly-academy', plan, SubscriptionStatus.ACTIVE)

        self.assertEqual(FinanceService.get_mrr(), Decimal('100.00'))

    def test_mrr_excludes_trial(self):
        plan = self.create_plan('trial-plan', price_monthly=Decimal('100.00'))
        self.create_subscription('trial-academy', plan, SubscriptionStatus.TRIAL)

        self.assertEqual(FinanceService.get_mrr(), Decimal('0.00'))

    def test_mrr_excludes_canceled(self):
        plan = self.create_plan('canceled-plan', price_monthly=Decimal('100.00'))
        self.create_subscription(
            'canceled-academy',
            plan,
            SubscriptionStatus.CANCELED,
            canceled_at=timezone.now(),
        )

        self.assertEqual(FinanceService.get_mrr(), Decimal('0.00'))

    def test_arr_is_mrr_times_12(self):
        with patch.object(FinanceService, 'get_mrr', return_value=Decimal('100.00')):
            self.assertEqual(FinanceService.get_arr(), Decimal('1200.00'))

    def test_churn_count_within_month(self):
        now = timezone.now()
        last_month = now - timedelta(days=31)
        plan = self.create_plan('churn-plan', price_monthly=Decimal('50.00'))

        self.create_subscription(
            'canceled-this-month',
            plan,
            SubscriptionStatus.CANCELED,
            canceled_at=now,
        )
        self.create_subscription(
            'canceled-last-month',
            plan,
            SubscriptionStatus.CANCELED,
            canceled_at=last_month,
        )

        self.assertEqual(FinanceService.get_churn_count(now.year, now.month), 1)

    def test_get_revenue_sums_payments_in_month(self):
        plan = self.create_plan('revenue-plan', price_monthly=Decimal('100.00'))
        subscription = self.create_subscription('revenue-academy', plan, SubscriptionStatus.ACTIVE)

        self.create_payment(subscription, Decimal('100.00'), date(2025, 3, 10))
        self.create_payment(subscription, Decimal('50.00'), date(2025, 3, 20))
        self.create_payment(subscription, Decimal('75.00'), date(2025, 4, 5))

        self.assertEqual(FinanceService.get_revenue(2025, 3), Decimal('150.00'))

    def test_get_expenses_sums_paid_only(self):
        self.create_paid_expense(ExpenseCategory.CLOUD, Decimal('50.00'), date(2025, 3, 15))
        OperationalExpense.objects.create(
            category=ExpenseCategory.SAAS,
            vendor_name='saas-vendor',
            amount=Decimal('20.00'),
            currency='USD',
            billing_cycle=BillingCycle.MONTHLY,
            is_paid=False,
        )

        self.assertEqual(FinanceService.get_expenses(2025, 3), Decimal('50.00'))

    def test_expense_breakdown_by_category(self):
        self.create_paid_expense(ExpenseCategory.CLOUD, Decimal('50.00'), date(2025, 3, 1))
        self.create_paid_expense(ExpenseCategory.CLOUD, Decimal('30.00'), date(2025, 3, 2))
        self.create_paid_expense(ExpenseCategory.SAAS, Decimal('20.00'), date(2025, 3, 3))

        self.assertEqual(
            FinanceService.get_expense_breakdown(2025, 3),
            [
                {'category': ExpenseCategory.CLOUD, 'total': Decimal('80.00')},
                {'category': ExpenseCategory.SAAS, 'total': Decimal('20.00')},
            ],
        )

    def test_pl_positive_when_revenue_exceeds_expenses(self):
        plan = self.create_plan('pl-positive-plan', price_monthly=Decimal('100.00'))
        subscription = self.create_subscription('pl-positive-academy', plan, SubscriptionStatus.ACTIVE)

        self.create_payment(subscription, Decimal('500.00'), date(2025, 3, 10))
        self.create_paid_expense(ExpenseCategory.CLOUD, Decimal('300.00'), date(2025, 3, 15))

        self.assertEqual(FinanceService.get_pl(2025, 3), Decimal('200.00'))

    def test_pl_negative_when_expenses_exceed_revenue(self):
        plan = self.create_plan('pl-negative-plan', price_monthly=Decimal('100.00'))
        subscription = self.create_subscription('pl-negative-academy', plan, SubscriptionStatus.ACTIVE)

        self.create_payment(subscription, Decimal('100.00'), date(2025, 3, 10))
        self.create_paid_expense(ExpenseCategory.CLOUD, Decimal('300.00'), date(2025, 3, 15))

        self.assertEqual(FinanceService.get_pl(2025, 3), Decimal('-200.00'))

    def test_summary_endpoint_returns_correct_shape(self):
        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get('/api/v1/platform/finance/summary/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            set(response.data.keys()),
            {
                'year',
                'month',
                'mrr',
                'arr',
                'active_subscriptions',
                'churn_count',
                'revenue',
                'expenses',
                'pl',
                'expense_breakdown',
            },
        )

    def test_summary_endpoint_with_year_month_params(self):
        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get('/api/v1/platform/finance/summary/?year=2025&month=3')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['year'], 2025)
        self.assertEqual(response.data['month'], 3)

    def test_summary_endpoint_invalid_month_returns_400(self):
        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get('/api/v1/platform/finance/summary/?year=2025&month=13')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data, {'detail': 'Invalid year or month.'})

    def test_403_for_non_superadmin(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get('/api/v1/platform/finance/summary/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
