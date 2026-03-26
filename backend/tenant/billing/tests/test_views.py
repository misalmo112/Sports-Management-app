"""
Tests for billing views and API endpoints.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from decimal import Decimal
from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from tenant.students.models import Parent, Student
from tenant.billing.models import Item, Invoice, InvoiceItem, Receipt
from tenant.notifications.models import NotificationLog
from saas_platform.tenants.models import AcademyWhatsAppConfig
from django.test.utils import CaptureQueriesContext
from django.db import connection

User = get_user_model()


class ItemViewSetTest(TestCase):
    """Test ItemViewSet API endpoints."""
    
    def setUp(self):
        self.client = APIClient()
        
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
            onboarding_completed=True
        )
        
        self.plan = Plan.objects.create(
            name="Basic Plan",
            slug="basic-plan",
            limits_json={'max_students': 100}
        )
        self.subscription = Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )
        
        self.admin = User.objects.create_user(
            email='admin@academy.com',
            password='testpass123',
            role='ADMIN',
            academy=self.academy
        )
        
        self.client.force_authenticate(user=self.admin)
        # Set academy in request
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
    
    def test_list_items(self):
        """Test listing items."""
        Item.objects.create(
            academy=self.academy,
            name="Monthly Fee",
            price=Decimal('100.00')
        )
        
        response = self.client.get('/api/v1/tenant/items/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_create_item(self):
        """Test creating an item."""
        data = {
            'name': 'Equipment Fee',
            'description': 'Equipment rental fee',
            'price': '50.00',
            'currency': 'USD'
        }
        
        response = self.client.post('/api/v1/tenant/items/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Item.objects.count(), 1)

    def test_create_item_currency_mismatch_returns_400(self):
        """Reject create when payload currency differs from academy currency."""
        self.academy.currency = 'AED'
        self.academy.save(update_fields=['currency'])

        data = {
            'name': 'Equipment Fee',
            'description': 'Equipment rental fee',
            'price': '50.00',
            'currency': 'USD',
        }

        response = self.client.post('/api/v1/tenant/items/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_item_currency_mismatch_returns_400(self):
        """Reject update when payload currency differs from academy currency."""
        item = Item.objects.create(
            academy=self.academy,
            name='Monthly Fee',
            price=Decimal('100.00'),
            currency='AED',
        )
        self.academy.currency = 'AED'
        self.academy.save(update_fields=['currency'])

        response = self.client.patch(
            f'/api/v1/tenant/items/{item.id}/',
            {'currency': 'USD'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_items_returns_academy_currency(self):
        """Always return academy currency even if DB row differs."""
        self.academy.currency = 'AED'
        self.academy.save(update_fields=['currency'])

        # Create an inconsistent row directly (bypassing serializer enforcement).
        Item.objects.create(
            academy=self.academy,
            name='Monthly Fee',
            price=Decimal('100.00'),
            currency='USD',
        )

        response = self.client.get('/api/v1/tenant/items/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['currency'], 'AED')
    
    def test_update_item(self):
        """Test updating an item."""
        item = Item.objects.create(
            academy=self.academy,
            name="Monthly Fee",
            price=Decimal('100.00')
        )
        
        data = {'price': '120.00'}
        response = self.client.patch(f'/api/v1/tenant/items/{item.id}/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        item.refresh_from_db()
        self.assertEqual(item.price, Decimal('120.00'))
    
    def test_delete_item_soft_delete(self):
        """Test that deleting item sets is_active=False."""
        item = Item.objects.create(
            academy=self.academy,
            name="Monthly Fee",
            price=Decimal('100.00')
        )
        
        response = self.client.delete(f'/api/v1/tenant/items/{item.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        item.refresh_from_db()
        self.assertFalse(item.is_active)


class InvoiceViewSetTest(TestCase):
    """Test InvoiceViewSet API endpoints."""
    
    def setUp(self):
        self.client = APIClient()
        
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
            onboarding_completed=True
        )
        
        self.plan = Plan.objects.create(
            name="Basic Plan",
            slug="basic-plan",
            limits_json={'max_students': 100}
        )
        self.subscription = Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )
        
        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="parent@example.com"
        )
        
        self.admin = User.objects.create_user(
            email='admin@academy.com',
            password='testpass123',
            role='ADMIN',
            academy=self.academy
        )
        
        self.parent_user = User.objects.create_user(
            email='parent@example.com',
            password='testpass123',
            role='PARENT',
            academy=self.academy
        )
    
    def test_create_invoice(self):
        """Test creating an invoice."""
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        
        data = {
            'parent_id': self.parent.id,
            'items': [
                {
                    'description': 'Monthly Fee',
                    'quantity': 1,
                    'unit_price': '100.00'
                }
            ]
        }
        
        response = self.client.post('/api/v1/tenant/invoices/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Invoice.objects.count(), 1)
        
        invoice = Invoice.objects.first()
        self.assertEqual(invoice.items.count(), 1)
        self.assertEqual(invoice.subtotal, Decimal('100.00'))
    
    def test_list_invoices_admin(self):
        """Test listing invoices as admin."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal('100.00')
        )
        
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        response = self.client.get('/api/v1/tenant/invoices/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_list_invoices_parent_visibility(self):
        """Test that parents only see their own invoices."""
        # Create invoice for parent
        invoice1 = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal('100.00')
        )
        
        # Create another parent and invoice
        parent2 = Parent.objects.create(
            academy=self.academy,
            first_name="Jane",
            last_name="Smith",
            email="jane@example.com"
        )
        invoice2 = Invoice.objects.create(
            academy=self.academy,
            parent=parent2,
            invoice_number="INV-002",
            total=Decimal('200.00')
        )
        
        # Parent user should only see their invoice
        self.client.force_authenticate(user=self.parent_user)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        response = self.client.get('/api/v1/tenant/invoices/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['invoice_number'], 'INV-001')
    
    def test_apply_discount(self):
        """Test applying discount to invoice."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            subtotal=Decimal('100.00'),
            total=Decimal('100.00')
        )
        
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        data = {
            'discount_type': 'PERCENTAGE',
            'discount_value': '10.00'
        }
        
        response = self.client.post(
            f'/api/v1/tenant/invoices/{invoice.id}/apply_discount/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        invoice.refresh_from_db()
        self.assertEqual(invoice.discount_amount, Decimal('10.00'))
        self.assertEqual(invoice.total, Decimal('90.00'))
    
    def test_add_payment(self):
        """Test adding payment to invoice."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal('100.00'),
            status=Invoice.Status.SENT
        )
        
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        data = {
            'amount': '50.00',
            'payment_method': 'CASH'
        }
        
        response = self.client.post(
            f'/api/v1/tenant/invoices/{invoice.id}/add_payment/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        invoice.refresh_from_db()
        self.assertEqual(invoice.get_paid_amount(), Decimal('50.00'))
        self.assertEqual(invoice.status, Invoice.Status.PARTIALLY_PAID)
    
    def test_mark_paid(self):
        """Test marking invoice as paid."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal('100.00'),
            status=Invoice.Status.SENT
        )
        
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        data = {
            'payment_method': 'CARD'
        }
        
        response = self.client.post(
            f'/api/v1/tenant/invoices/{invoice.id}/mark_paid/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, Invoice.Status.PAID)
        self.assertEqual(invoice.get_paid_amount(), Decimal('100.00'))
    
    def test_parent_cannot_apply_discount(self):
        """Test that parents cannot apply discounts."""
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal('100.00')
        )
        
        self.client.force_authenticate(user=self.parent_user)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        data = {
            'discount_type': 'PERCENTAGE',
            'discount_value': '10.00'
        }
        
        response = self.client.post(
            f'/api/v1/tenant/invoices/{invoice.id}/apply_discount/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_academy_isolation(self):
        """Test that academies cannot see each other's invoices."""
        academy2 = Academy.objects.create(
            name="Academy 2",
            slug="academy-2",
            email="academy2@test.com",
            onboarding_completed=True
        )
        
        parent2 = Parent.objects.create(
            academy=academy2,
            first_name="Jane",
            last_name="Smith",
            email="jane@example.com"
        )
        
        invoice2 = Invoice.objects.create(
            academy=academy2,
            parent=parent2,
            invoice_number="INV-002",
            total=Decimal('200.00')
        )
        
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        response = self.client.get('/api/v1/tenant/invoices/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should not see academy2's invoice
        invoice_numbers = [inv['invoice_number'] for inv in response.data['results']]
        self.assertNotIn('INV-002', invoice_numbers)


class ReceiptViewSetTest(TestCase):
    """Test ReceiptViewSet API endpoints."""
    
    def setUp(self):
        self.client = APIClient()
        
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
            onboarding_completed=True
        )
        
        self.plan = Plan.objects.create(
            name="Basic Plan",
            slug="basic-plan",
            limits_json={'max_students': 100}
        )
        self.subscription = Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )
        
        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="parent@example.com"
        )
        
        self.invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal('100.00')
        )
        
        self.admin = User.objects.create_user(
            email='admin@academy.com',
            password='testpass123',
            role='ADMIN',
            academy=self.academy
        )
        
        self.parent_user = User.objects.create_user(
            email='parent@example.com',
            password='testpass123',
            role='PARENT',
            academy=self.academy
        )
    
    def test_create_receipt(self):
        """Test creating a receipt."""
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        
        data = {
            'invoice': self.invoice.id,
            'amount': '50.00',
            'payment_method': 'CASH'
        }
        
        response = self.client.post('/api/v1/tenant/receipts/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Receipt.objects.count(), 1)
        
        receipt = Receipt.objects.first()
        self.assertEqual(receipt.amount, Decimal('50.00'))
    
    def test_list_receipts_parent_visibility(self):
        """Test that parents only see receipts for their invoices."""
        receipt1 = Receipt.objects.create(
            academy=self.academy,
            invoice=self.invoice,
            receipt_number="RCP-001",
            amount=Decimal('50.00'),
            payment_method=Receipt.PaymentMethod.CASH
        )
        
        # Create another parent and invoice
        parent2 = Parent.objects.create(
            academy=self.academy,
            first_name="Jane",
            last_name="Smith",
            email="jane@example.com"
        )
        invoice2 = Invoice.objects.create(
            academy=self.academy,
            parent=parent2,
            invoice_number="INV-002",
            total=Decimal('200.00')
        )
        receipt2 = Receipt.objects.create(
            academy=self.academy,
            invoice=invoice2,
            receipt_number="RCP-002",
            amount=Decimal('100.00'),
            payment_method=Receipt.PaymentMethod.CARD
        )
        
        # Parent user should only see their receipt
        self.client.force_authenticate(user=self.parent_user)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        response = self.client.get('/api/v1/tenant/receipts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['receipt_number'], 'RCP-001')


class InvoiceNotificationSummaryTest(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
            onboarding_completed=True,
        )
        self.plan = Plan.objects.create(
            name="Basic Plan",
            slug="basic-plan",
            limits_json={"max_students": 100},
        )
        self.subscription = Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now(),
        )

        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="parent@example.com",
        )

        self.admin = User.objects.create_user(
            email="admin@academy.com",
            password="testpass123",
            role="ADMIN",
            academy=self.academy,
        )

        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

    def test_notification_summary_latest_status_per_channel(self):
        # Enable WhatsApp config so we expect whatsapp_status in the response.
        AcademyWhatsAppConfig.objects.create(academy=self.academy, is_enabled=True)

        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal("100.00"),
        )

        older = timezone.now() - timezone.timedelta(hours=2)
        newer = timezone.now() - timezone.timedelta(hours=1)

        # Email: older FAILED, newer SENT => expect SENT.
        NotificationLog.objects.create(
            academy=self.academy,
            channel=NotificationLog.Channel.EMAIL,
            doc_type=NotificationLog.DocType.INVOICE,
            object_id=invoice.id,
            status=NotificationLog.Status.FAILED,
            recipient_email="e1@example.com",
            recipient_phone="",
            error_detail="old email error",
            sent_at=older,
        )
        NotificationLog.objects.create(
            academy=self.academy,
            channel=NotificationLog.Channel.EMAIL,
            doc_type=NotificationLog.DocType.INVOICE,
            object_id=invoice.id,
            status=NotificationLog.Status.SENT,
            recipient_email="e2@example.com",
            recipient_phone="",
            error_detail="",
            sent_at=newer,
        )

        # WhatsApp: older SKIPPED, newer FAILED => expect FAILED.
        NotificationLog.objects.create(
            academy=self.academy,
            channel=NotificationLog.Channel.WHATSAPP,
            doc_type=NotificationLog.DocType.INVOICE,
            object_id=invoice.id,
            status=NotificationLog.Status.SKIPPED,
            recipient_email="",
            recipient_phone="+1555000111",
            error_detail="",
            sent_at=older,
        )
        NotificationLog.objects.create(
            academy=self.academy,
            channel=NotificationLog.Channel.WHATSAPP,
            doc_type=NotificationLog.DocType.INVOICE,
            object_id=invoice.id,
            status=NotificationLog.Status.FAILED,
            recipient_email="",
            recipient_phone="+1555000111",
            error_detail="wa failed",
            sent_at=newer,
        )

        resp = self.client.get("/api/v1/tenant/invoices/?page_size=10")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data["results"]), 1)

        summary = resp.data["results"][0]["notification_summary"]
        self.assertEqual(summary["email"], NotificationLog.Status.SENT)
        self.assertEqual(summary["whatsapp"], NotificationLog.Status.FAILED)

    def test_notification_summary_whatsapp_is_null_when_config_missing(self):
        # No WhatsApp config created => whatsapp should be hidden (null).
        invoice = Invoice.objects.create(
            academy=self.academy,
            parent=self.parent,
            invoice_number="INV-001",
            total=Decimal("100.00"),
        )

        NotificationLog.objects.create(
            academy=self.academy,
            channel=NotificationLog.Channel.WHATSAPP,
            doc_type=NotificationLog.DocType.INVOICE,
            object_id=invoice.id,
            status=NotificationLog.Status.SENT,
            recipient_email="",
            recipient_phone="+1555000111",
            error_detail="",
        )

        resp = self.client.get("/api/v1/tenant/invoices/?page_size=10")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        summary = resp.data["results"][0]["notification_summary"]

        self.assertEqual(summary["whatsapp"], None)

    def test_invoice_list_notification_summary_query_count_constant_for_50_invoices(self):
        # Ensure WhatsApp config exists but keep it enabled so annotation + serializer paths are exercised.
        AcademyWhatsAppConfig.objects.create(academy=self.academy, is_enabled=True)

        invoices = []
        now = timezone.now()
        for i in range(50):
            inv = Invoice.objects.create(
                academy=self.academy,
                parent=self.parent,
                invoice_number=f"INV-{i:03d}",
                total=Decimal("100.00"),
            )
            invoices.append(inv)

        # Add logs for both channels for each invoice.
        for i, inv in enumerate(invoices):
            NotificationLog.objects.create(
                academy=self.academy,
                channel=NotificationLog.Channel.EMAIL,
                doc_type=NotificationLog.DocType.INVOICE,
                object_id=inv.id,
                status=NotificationLog.Status.SENT if i % 2 == 0 else NotificationLog.Status.FAILED,
                recipient_email="e@example.com",
                recipient_phone="",
                error_detail="" if i % 2 == 0 else "email failed",
                sent_at=now - timezone.timedelta(minutes=i),
            )
            NotificationLog.objects.create(
                academy=self.academy,
                channel=NotificationLog.Channel.WHATSAPP,
                doc_type=NotificationLog.DocType.INVOICE,
                object_id=inv.id,
                status=NotificationLog.Status.SENT if i % 3 == 0 else NotificationLog.Status.SKIPPED,
                recipient_email="",
                recipient_phone="+1555000111",
                error_detail="",
                sent_at=now - timezone.timedelta(minutes=i, hours=1),
            )

        with CaptureQueriesContext(connection) as ctx:
            resp = self.client.get("/api/v1/tenant/invoices/?page_size=50")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Expect invoice list to be a small constant number of queries:
        # 1) count, 2) annotated invoices, 3) prefetch receipts.
        self.assertLessEqual(len(ctx), 8)
