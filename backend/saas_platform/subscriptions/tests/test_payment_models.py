from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.subscriptions.models import (
    PaymentMethod,
    Plan,
    PlatformPayment,
    Subscription,
    SubscriptionStatus,
)
from saas_platform.subscriptions.serializers import PlatformPaymentSerializer
from saas_platform.tenants.models import Academy


User = get_user_model()


class PlatformPaymentTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.superadmin = User.objects.create_superuser(
            email='superadmin-payments@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            is_active=True,
        )

        self.academy_a = Academy.objects.create(
            name='Academy A',
            slug='academy-a',
            email='academy-a@example.com',
        )
        self.academy_b = Academy.objects.create(
            name='Academy B',
            slug='academy-b',
            email='academy-b@example.com',
        )

        self.admin = User.objects.create_user(
            email='academy-admin@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.academy_a,
            is_active=True,
            is_superuser=False,
            is_staff=False,
        )

        self.plan = Plan.objects.create(
            name='Platform Plan',
            slug='platform-plan',
            price_monthly=Decimal('99.00'),
            price_yearly=Decimal('990.00'),
            currency='USD',
            limits_json={'max_students': 100, 'storage_bytes': 10737418240},
            is_active=True,
            is_public=True,
        )

        self.subscription_a = Subscription.objects.create(
            academy=self.academy_a,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now(),
        )
        self.subscription_b = Subscription.objects.create(
            academy=self.academy_b,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now(),
        )

    def test_create_payment_with_valid_data(self):
        payment = PlatformPayment.objects.create(
            subscription=self.subscription_a,
            academy=self.academy_a,
            amount=Decimal('125.50'),
            currency='USD',
            payment_method=PaymentMethod.CREDIT_CARD,
            payment_date=date.today(),
            invoice_ref='INV-001',
            notes='Monthly billing cycle payment',
            external_ref='',
            synced_at=None,
        )

        self.assertEqual(payment.subscription, self.subscription_a)
        self.assertEqual(payment.academy, self.academy_a)
        self.assertEqual(payment.amount, Decimal('125.50'))
        self.assertEqual(payment.currency, 'USD')
        self.assertEqual(payment.payment_method, PaymentMethod.CREDIT_CARD)
        self.assertEqual(payment.payment_date, date.today())
        self.assertEqual(payment.invoice_ref, 'INV-001')
        self.assertEqual(payment.notes, 'Monthly billing cycle payment')
        self.assertEqual(payment.external_ref, '')
        self.assertIsNone(payment.synced_at)

    def test_payment_requires_positive_amount(self):
        base_data = {
            'subscription': self.subscription_a.id,
            'academy': self.academy_a.id,
            'currency': 'USD',
            'payment_method': PaymentMethod.BANK_TRANSFER,
            'payment_date': date.today(),
        }

        serializer_zero = PlatformPaymentSerializer(data={**base_data, 'amount': '0.00'})
        self.assertFalse(serializer_zero.is_valid())
        self.assertIn('amount', serializer_zero.errors)

        serializer_negative = PlatformPaymentSerializer(data={**base_data, 'amount': '-1.00'})
        self.assertFalse(serializer_negative.is_valid())
        self.assertIn('amount', serializer_negative.errors)

    def test_payment_date_cannot_be_future(self):
        serializer = PlatformPaymentSerializer(data={
            'subscription': self.subscription_a.id,
            'academy': self.academy_a.id,
            'amount': '10.00',
            'currency': 'USD',
            'payment_method': PaymentMethod.CASH,
            'payment_date': date.today() + timedelta(days=1),
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('payment_date', serializer.errors)

    def test_list_filtered_by_academy(self):
        PlatformPayment.objects.create(
            subscription=self.subscription_a,
            academy=self.academy_a,
            amount=Decimal('50.00'),
            currency='USD',
            payment_method=PaymentMethod.CASH,
            payment_date=date.today() - timedelta(days=2),
        )
        PlatformPayment.objects.create(
            subscription=self.subscription_b,
            academy=self.academy_b,
            amount=Decimal('75.00'),
            currency='USD',
            payment_method=PaymentMethod.CHEQUE,
            payment_date=date.today() - timedelta(days=1),
        )

        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get(f'/api/v1/platform/finance/payments/?academy={self.academy_a.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['academy'], self.academy_a.id)

    def test_list_filtered_by_date_range(self):
        old_payment = PlatformPayment.objects.create(
            subscription=self.subscription_a,
            academy=self.academy_a,
            amount=Decimal('20.00'),
            currency='USD',
            payment_method=PaymentMethod.CASH,
            payment_date=date.today() - timedelta(days=10),
        )
        middle_payment = PlatformPayment.objects.create(
            subscription=self.subscription_a,
            academy=self.academy_a,
            amount=Decimal('30.00'),
            currency='USD',
            payment_method=PaymentMethod.CREDIT_CARD,
            payment_date=date.today() - timedelta(days=5),
        )
        new_payment = PlatformPayment.objects.create(
            subscription=self.subscription_a,
            academy=self.academy_a,
            amount=Decimal('40.00'),
            currency='USD',
            payment_method=PaymentMethod.BANK_TRANSFER,
            payment_date=date.today() - timedelta(days=1),
        )

        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get(
            '/api/v1/platform/finance/payments/',
            {
                'payment_date_after': (date.today() - timedelta(days=6)).isoformat(),
                'payment_date_before': (date.today() - timedelta(days=2)).isoformat(),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        result_ids = {item['id'] for item in response.data['results']}
        self.assertEqual(result_ids, {middle_payment.id})
        self.assertNotIn(old_payment.id, result_ids)
        self.assertNotIn(new_payment.id, result_ids)

    def test_protect_on_subscription_delete(self):
        PlatformPayment.objects.create(
            subscription=self.subscription_a,
            academy=self.academy_a,
            amount=Decimal('99.00'),
            currency='USD',
            payment_method=PaymentMethod.OTHER,
            payment_date=date.today(),
        )

        with self.assertRaises(ProtectedError):
            self.subscription_a.delete()

    def test_403_for_non_superadmin(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get('/api/v1/platform/finance/payments/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
