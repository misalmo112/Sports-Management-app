from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.finance.models import BillingCycle, ExpenseCategory, OperationalExpense
from saas_platform.finance.serializers import OperationalExpenseSerializer
from saas_platform.tenants.models import Academy


User = get_user_model()


class OperationalExpenseTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.superadmin = User.objects.create_superuser(
            email='superadmin-expenses@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            is_active=True,
        )

        self.academy = Academy.objects.create(
            name='Expense Test Academy',
            slug='expense-test-academy',
            email='expenses@example.com',
        )
        self.admin = User.objects.create_user(
            email='admin-expenses@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.academy,
            is_active=True,
            is_superuser=False,
            is_staff=False,
        )

    def test_create_expense_with_valid_data(self):
        expense = OperationalExpense.objects.create(
            category=ExpenseCategory.CLOUD,
            vendor_name='AWS',
            description='Monthly cloud hosting',
            amount=Decimal('120.00'),
            currency='USD',
            billing_cycle=BillingCycle.MONTHLY,
            due_date=date.today() + timedelta(days=7),
            paid_date=date.today(),
            is_paid=True,
            notes='Auto-renewed',
        )

        self.assertEqual(expense.category, ExpenseCategory.CLOUD)
        self.assertEqual(expense.vendor_name, 'AWS')
        self.assertEqual(expense.description, 'Monthly cloud hosting')
        self.assertEqual(expense.amount, Decimal('120.00'))
        self.assertEqual(expense.currency, 'USD')
        self.assertEqual(expense.billing_cycle, BillingCycle.MONTHLY)
        self.assertEqual(expense.due_date, date.today() + timedelta(days=7))
        self.assertEqual(expense.paid_date, date.today())
        self.assertTrue(expense.is_paid)
        self.assertEqual(expense.notes, 'Auto-renewed')

    def test_amount_must_be_positive(self):
        serializer = OperationalExpenseSerializer(data={
            'category': ExpenseCategory.CLOUD,
            'vendor_name': 'AWS',
            'amount': '0.00',
            'currency': 'USD',
            'billing_cycle': BillingCycle.MONTHLY,
            'is_paid': False,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('amount', serializer.errors)

    def test_paid_date_requires_is_paid_true(self):
        serializer = OperationalExpenseSerializer(data={
            'category': ExpenseCategory.DOMAIN,
            'vendor_name': 'Cloudflare',
            'amount': '15.00',
            'currency': 'USD',
            'billing_cycle': BillingCycle.YEARLY,
            'paid_date': date.today(),
            'is_paid': False,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)

    def test_is_paid_true_requires_paid_date(self):
        serializer = OperationalExpenseSerializer(data={
            'category': ExpenseCategory.SAAS,
            'vendor_name': 'Notion',
            'amount': '12.00',
            'currency': 'USD',
            'billing_cycle': BillingCycle.MONTHLY,
            'is_paid': True,
            'paid_date': None,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)

    def test_list_filtered_by_category(self):
        OperationalExpense.objects.create(
            category=ExpenseCategory.CLOUD,
            vendor_name='AWS',
            amount=Decimal('120.00'),
            currency='USD',
            billing_cycle=BillingCycle.MONTHLY,
            is_paid=False,
        )
        OperationalExpense.objects.create(
            category=ExpenseCategory.DOMAIN,
            vendor_name='Cloudflare',
            amount=Decimal('20.00'),
            currency='USD',
            billing_cycle=BillingCycle.YEARLY,
            is_paid=False,
        )

        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get('/api/v1/platform/finance/expenses/?category=CLOUD')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['category'], ExpenseCategory.CLOUD)

    def test_list_filtered_by_is_paid(self):
        OperationalExpense.objects.create(
            category=ExpenseCategory.CLOUD,
            vendor_name='AWS',
            amount=Decimal('120.00'),
            currency='USD',
            billing_cycle=BillingCycle.MONTHLY,
            paid_date=date.today(),
            is_paid=True,
        )
        OperationalExpense.objects.create(
            category=ExpenseCategory.DOMAIN,
            vendor_name='Cloudflare',
            amount=Decimal('20.00'),
            currency='USD',
            billing_cycle=BillingCycle.YEARLY,
            is_paid=False,
        )

        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get('/api/v1/platform/finance/expenses/?is_paid=true')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertTrue(response.data['results'][0]['is_paid'])

    def test_list_filtered_by_paid_date_range(self):
        old_expense = OperationalExpense.objects.create(
            category=ExpenseCategory.CLOUD,
            vendor_name='AWS',
            amount=Decimal('100.00'),
            currency='USD',
            billing_cycle=BillingCycle.MONTHLY,
            paid_date=date.today() - timedelta(days=10),
            is_paid=True,
        )
        middle_expense = OperationalExpense.objects.create(
            category=ExpenseCategory.SAAS,
            vendor_name='Slack',
            amount=Decimal('15.00'),
            currency='USD',
            billing_cycle=BillingCycle.MONTHLY,
            paid_date=date.today() - timedelta(days=5),
            is_paid=True,
        )
        new_expense = OperationalExpense.objects.create(
            category=ExpenseCategory.DOMAIN,
            vendor_name='Cloudflare',
            amount=Decimal('20.00'),
            currency='USD',
            billing_cycle=BillingCycle.YEARLY,
            paid_date=date.today() - timedelta(days=1),
            is_paid=True,
        )

        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get(
            '/api/v1/platform/finance/expenses/',
            {
                'paid_date_after': (date.today() - timedelta(days=6)).isoformat(),
                'paid_date_before': (date.today() - timedelta(days=2)).isoformat(),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        result_ids = {item['id'] for item in response.data['results']}
        self.assertEqual(result_ids, {middle_expense.id})
        self.assertNotIn(old_expense.id, result_ids)
        self.assertNotIn(new_expense.id, result_ids)

    def test_destroy_allowed(self):
        expense = OperationalExpense.objects.create(
            category=ExpenseCategory.OTHER,
            vendor_name='Consultant',
            amount=Decimal('300.00'),
            currency='USD',
            billing_cycle=BillingCycle.ONE_TIME,
            is_paid=False,
        )

        self.client.force_authenticate(user=self.superadmin)
        response = self.client.delete(f'/api/v1/platform/finance/expenses/{expense.id}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(OperationalExpense.objects.filter(id=expense.id).exists())

    def test_403_for_non_superadmin(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get('/api/v1/platform/finance/expenses/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
