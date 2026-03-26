"""
Tests for ErrorLog ingestion pipeline.
"""
from unittest.mock import patch
from django.test import TestCase, RequestFactory
from rest_framework.test import APIClient
from saas_platform.audit.models import ErrorLog
from saas_platform.audit.services import ErrorLogService


class ErrorLogServiceTests(TestCase):

    def setUp(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        self.factory = RequestFactory()

    def _make_request(self, path='/api/v1/test/'):
        request = self.factory.get(path)
        request.request_id = 'test-request-id'
        request.academy = None
        request.user = self.user
        return request

    def test_capture_creates_critical_errorlog_for_500(self):
        """A 500 error creates an ErrorLog with severity='CRITICAL'."""
        request = self._make_request()
        exc = Exception('Test 500 error')
        ErrorLogService.capture(exc, request, status_code=500)

        log = ErrorLog.objects.filter(path='/api/v1/test/').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.severity, ErrorLog.Severity.CRITICAL)
        self.assertEqual(log.status_code, 500)

    def test_capture_deduplicates_within_window(self):
        """Same error within 60 minutes increments occurrence_count instead of new row."""
        request = self._make_request('/api/v1/dedup/')
        exc = Exception('Dedup test')

        ErrorLogService.capture(exc, request, status_code=500)
        ErrorLogService.capture(exc, request, status_code=500)

        logs = ErrorLog.objects.filter(path='/api/v1/dedup/')
        self.assertEqual(logs.count(), 1)
        self.assertEqual(logs.first().occurrence_count, 2)

    def test_resolve_marks_error_resolved(self):
        """ErrorLogService.resolve() sets is_resolved=True and resolved_by."""
        log = ErrorLog.objects.create(
            path='/api/v1/test/',
            method='GET',
            status_code=500,
            code='TEST_ERROR',
            message='Test',
            service='backend',
            environment='test',
        )

        result = ErrorLogService.resolve(log.pk, self.user)
        self.assertTrue(result)

        log.refresh_from_db()
        self.assertTrue(log.is_resolved)
        self.assertEqual(log.resolved_by, self.user)
        self.assertIsNotNone(log.resolved_at)

    def test_capture_never_raises(self):
        """ErrorLogService.capture() swallows all exceptions."""
        request = self._make_request()
        exc = Exception('Test error')
        with patch.object(ErrorLog.objects, 'filter', side_effect=Exception('DB down')):
            # Must not raise
            ErrorLogService.capture(exc, request, status_code=500)


class ErrorLogAPITests(TestCase):

    def setUp(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123'
        )
        self.client = APIClient()

    def test_request_id_header_present(self):
        """X-Request-Id header is present on every API response."""
        response = self.client.get('/health/')
        self.assertIn('X-Request-Id', response)

    def test_ingest_returns_201_for_authenticated(self):
        """Ingest endpoint returns 201 for authenticated user."""
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            '/api/v1/platform/error-logs/ingest/',
            {'code': 'REACT_ERROR', 'message': 'Test', 'path': '/dashboard'},
            format='json',
        )
        self.assertEqual(response.status_code, 201)

    def test_ingest_returns_401_for_unauthenticated(self):
        """Ingest endpoint returns 401 for unauthenticated request."""
        response = self.client.post(
            '/api/v1/platform/error-logs/ingest/',
            {'code': 'REACT_ERROR', 'message': 'Test'},
            format='json',
        )
        self.assertEqual(response.status_code, 401)

    def test_resolve_requires_platform_admin(self):
        """Non-platform-admin gets 403 on resolve endpoint."""
        self.client.force_authenticate(user=self.user)
        log = ErrorLog.objects.create(
            path='/api/v1/test/',
            method='GET',
            status_code=500,
            code='TEST_ERROR',
            message='Test',
            service='backend',
            environment='test',
        )
        response = self.client.post(f'/api/v1/platform/error-logs/{log.pk}/resolve/')
        self.assertEqual(response.status_code, 403)
