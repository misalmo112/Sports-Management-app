from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.tenants.models import Academy

User = get_user_model()


class CurrentAccountViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.academy = Academy.objects.create(
            name='Storm Academy',
            slug='storm-academy',
            email='hello@storm.test',
            onboarding_completed=True,
        )
        self.admin = User.objects.create_user(
            email='admin@storm.test',
            password='SecurePassword123!',
            role='ADMIN',
            academy=self.academy,
            is_active=True,
            is_verified=True,
            first_name='Casey',
            last_name='Jones',
        )
        self.other_user = User.objects.create_user(
            email='other@storm.test',
            password='SecurePassword123!',
            role='ADMIN',
            academy=self.academy,
            is_active=True,
            is_verified=True,
        )
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

    def tearDown(self):
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

    def test_get_current_account(self):
        response = self.client.get('/api/v1/tenant/account/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.admin.email)
        self.assertEqual(response.data['first_name'], self.admin.first_name)

    def test_get_current_account_admin_includes_null_allowed_modules(self):
        response = self.client.get('/api/v1/tenant/account/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('allowed_modules', response.data)
        self.assertIsNone(response.data['allowed_modules'])

    def test_get_current_account_staff_includes_allowed_modules(self):
        staff = User.objects.create_user(
            email='staff@storm.test',
            password='SecurePassword123!',
            role='STAFF',
            academy=self.academy,
            is_active=True,
            is_verified=True,
            allowed_modules=['students', 'classes'],
        )
        self.client.force_authenticate(user=staff)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

        response = self.client.get('/api/v1/tenant/account/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], staff.email)
        self.assertEqual(response.data['role'], 'STAFF')
        self.assertEqual(response.data['allowed_modules'], ['students', 'classes'])

    def test_patch_current_account_staff_allowed_modules_read_only(self):
        staff = User.objects.create_user(
            email='staff2@storm.test',
            password='SecurePassword123!',
            role='STAFF',
            academy=self.academy,
            is_active=True,
            is_verified=True,
            allowed_modules=['students', 'classes'],
        )
        self.client.force_authenticate(user=staff)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))

        response = self.client.patch(
            '/api/v1/tenant/account/',
            {
                'first_name': 'Pat',
                'allowed_modules': ['invoices', 'receipts'],
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        staff.refresh_from_db()
        self.assertEqual(staff.first_name, 'Pat')
        self.assertEqual(staff.allowed_modules, ['students', 'classes'])
        self.assertEqual(response.data['allowed_modules'], ['students', 'classes'])

    def test_patch_current_account_updates_email_and_name(self):
        response = self.client.patch(
            '/api/v1/tenant/account/',
            {
                'email': 'updated@storm.test',
                'first_name': 'Jordan',
                'last_name': 'Miles',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.email, 'updated@storm.test')
        self.assertEqual(self.admin.first_name, 'Jordan')
        self.assertEqual(self.admin.last_name, 'Miles')

    def test_patch_current_account_rejects_duplicate_email(self):
        response = self.client.patch(
            '/api/v1/tenant/account/',
            {'email': self.other_user.email},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data['details'])

    def test_change_password_updates_user_password(self):
        response = self.client.post(
            '/api/v1/tenant/account/change-password/',
            {
                'current_password': 'SecurePassword123!',
                'new_password': 'NewSecurePassword123!',
                'new_password_confirm': 'NewSecurePassword123!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_password('NewSecurePassword123!'))

    def test_change_password_rejects_wrong_current_password(self):
        response = self.client.post(
            '/api/v1/tenant/account/change-password/',
            {
                'current_password': 'WrongPassword123!',
                'new_password': 'NewSecurePassword123!',
                'new_password_confirm': 'NewSecurePassword123!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('current_password', response.data['details'])
