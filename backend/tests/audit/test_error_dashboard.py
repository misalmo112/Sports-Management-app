"""
Tests for error dashboard summary endpoint.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from saas_platform.audit.models import ErrorLog


class ErrorDashboardTests(TestCase):

    def setUp(self):
        from django.contrib.auth import get_user_model
        from saas_platform.tenants.models import Academy
        User = get_user_model()

        # Platform admin — uses is_staff as the IsPlatformAdmin check
        self.superadmin = User.objects.create_user(
            email='superadmin@platform.com',
            password='testpass',
        )
        self.superadmin.is_staff = True
        self.superadmin.save()

        self.regular_user = User.objects.create_user(
            email='user@academy.com',
            password='testpass',
        )

        self.academy1 = Academy.objects.create(name='Academy One', slug='acad-one-dash')
        self.academy2 = Academy.objects.create(name='Academy Two', slug='acad-two-dash')

        ErrorLog.objects.create(
            path='/api/v1/test/', method='GET', status_code=500,
            code='INTERNAL_ERROR', message='Test 1',
            service='backend', environment='test',
            severity=ErrorLog.Severity.CRITICAL, is_resolved=False,
            academy=self.academy1,
        )
        ErrorLog.objects.create(
            path='/api/v1/test2/', method='GET', status_code=500,
            code='INTERNAL_ERROR', message='Test 2',
            service='backend', environment='test',
            severity=ErrorLog.Severity.CRITICAL, is_resolved=False,
            academy=self.academy1,
        )
        ErrorLog.objects.create(
            path='/api/v1/test3/', method='GET', status_code=503,
            code='DEPENDENCY_ERROR', message='Test 3',
            service='backend', environment='test',
            severity=ErrorLog.Severity.HIGH, is_resolved=False,
            academy=self.academy2,
        )
        ErrorLog.objects.create(
            path='/api/v1/resolved/', method='GET', status_code=500,
            code='INTERNAL_ERROR', message='Resolved',
            service='backend', environment='test',
            severity=ErrorLog.Severity.CRITICAL, is_resolved=True,
            academy=self.academy1,
        )

        self.client = APIClient()

    def _get_summary(self, user):
        self.client.force_authenticate(user=user)
        return self.client.get('/api/v1/platform/error-logs/summary/')

    def test_summary_returns_critical_unresolved_count(self):
        """Summary returns correct critical_unresolved count (resolved excluded)."""
        response = self._get_summary(self.superadmin)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['critical_unresolved'], 2)

    def test_summary_most_affected_academy(self):
        """most_affected_academy is the academy with the most unresolved errors."""
        response = self._get_summary(self.superadmin)
        self.assertEqual(response.status_code, 200)
        most_affected = response.data['most_affected_academy']
        self.assertIsNotNone(most_affected)
        self.assertEqual(most_affected['name'], 'Academy One')
        self.assertEqual(most_affected['count'], 2)

    def test_severity_filter(self):
        """Filtering by severity=CRITICAL returns only CRITICAL entries."""
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get('/api/v1/platform/error-logs/?severity=CRITICAL')
        self.assertEqual(response.status_code, 200)
        for entry in response.data['results']:
            self.assertEqual(entry['severity'], 'CRITICAL')

    def test_is_resolved_false_filter(self):
        """Filtering by is_resolved=false returns only unresolved entries."""
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get('/api/v1/platform/error-logs/?is_resolved=false')
        self.assertEqual(response.status_code, 200)
        for entry in response.data['results']:
            self.assertFalse(entry['is_resolved'])

    def test_summary_requires_platform_admin(self):
        """Non-platform-admin gets 403 on summary endpoint."""
        response = self._get_summary(self.regular_user)
        self.assertEqual(response.status_code, 403)
