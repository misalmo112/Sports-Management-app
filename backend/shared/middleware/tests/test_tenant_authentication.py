import uuid
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase

from shared.authentication import TenantAwareJWTAuthentication

User = get_user_model()

class TenantAwareJWTAuthenticationTest(SimpleTestCase):
    def setUp(self):
        self.auth = TenantAwareJWTAuthentication()

    @patch('shared.authentication.connection')
    @patch.object(TenantAwareJWTAuthentication, '_get_schema_name', return_value=None)
    @patch.object(TenantAwareJWTAuthentication, 'get_validated_token')
    @patch.object(TenantAwareJWTAuthentication, 'get_raw_token')
    @patch.object(TenantAwareJWTAuthentication, 'get_header')
    @patch.object(TenantAwareJWTAuthentication, '_resolve_academy_from_header')
    @patch('rest_framework_simplejwt.authentication.JWTAuthentication.authenticate')
    def test_authenticate_uses_super_when_not_postgres(
        self,
        mock_super_auth,
        mock_resolve_academy,
        mock_get_header,
        mock_get_raw,
        mock_get_validated,
        mock_get_schema,
        mock_connection,
    ):
        """SQLite / non-PG: defer to SimpleJWT default lookup."""
        mock_connection.vendor = 'sqlite'
        mock_resolve_academy.return_value = Mock()
        mock_get_header.return_value = b'Bearer x'
        mock_get_raw.return_value = b'x'
        mock_get_validated.return_value = {'user_id': 5}
        expected = ('user-5', 'validated-token')
        mock_super_auth.return_value = expected

        request = Mock()
        result = self.auth.authenticate(request)

        self.assertEqual(result, expected)
        mock_super_auth.assert_called_once_with(request)

    @patch('shared.authentication.connection')
    @patch.object(TenantAwareJWTAuthentication, 'get_validated_token')
    @patch.object(TenantAwareJWTAuthentication, 'get_raw_token')
    @patch.object(TenantAwareJWTAuthentication, 'get_header')
    @patch.object(TenantAwareJWTAuthentication, '_get_schema_name')
    @patch.object(TenantAwareJWTAuthentication, '_resolve_academy_from_header')
    @patch('rest_framework_simplejwt.authentication.JWTAuthentication.authenticate')
    def test_authenticate_postgres_prefers_tenant_user(
        self,
        mock_super_auth,
        mock_resolve_academy,
        mock_get_schema,
        mock_get_header,
        mock_get_raw,
        mock_get_validated,
        mock_connection,
    ):
        mock_connection.vendor = 'postgresql'
        academy = Mock()
        academy.id = 'acad-id'
        mock_resolve_academy.return_value = academy
        mock_get_schema.return_value = 'tenant_test'
        mock_get_header.return_value = b'Bearer x'
        mock_get_raw.return_value = b'x'
        mock_get_validated.return_value = {'user_id': 1}

        tenant_user = Mock(pk=1, academy_id=academy.id)

        with patch('shared.authentication.schema_context') as schema_ctx:
            cm = schema_ctx.return_value.__enter__
            cm.return_value = True
            schema_ctx.return_value.__exit__.return_value = False
            with patch('shared.authentication.User.objects.get', return_value=tenant_user):
                request = Mock()
                request.academy = academy
                result = self.auth.authenticate(request)

        self.assertEqual(result, (tenant_user, {'user_id': 1}))
        mock_super_auth.assert_not_called()

    @patch('shared.authentication.connection')
    @patch.object(TenantAwareJWTAuthentication, 'get_validated_token')
    @patch.object(TenantAwareJWTAuthentication, 'get_raw_token')
    @patch.object(TenantAwareJWTAuthentication, 'get_header')
    @patch.object(TenantAwareJWTAuthentication, '_get_schema_name')
    @patch.object(TenantAwareJWTAuthentication, '_resolve_academy_from_header')
    @patch('rest_framework_simplejwt.authentication.JWTAuthentication.authenticate')
    def test_authenticate_postgres_public_user_when_missing_from_tenant_schema(
        self,
        mock_super_auth,
        mock_resolve_academy,
        mock_get_schema,
        mock_get_header,
        mock_get_raw,
        mock_get_validated,
        mock_connection,
    ):
        """Public-schema tenant users must still authenticate when X-Academy-ID is set."""
        mock_connection.vendor = 'postgresql'
        aid = uuid.uuid4()
        academy = Mock()
        academy.id = aid
        mock_resolve_academy.return_value = academy
        mock_get_schema.return_value = 'tenant_test'
        mock_get_header.return_value = b'Bearer x'
        mock_get_raw.return_value = b'x'
        mock_get_validated.return_value = {'user_id': 42}

        public_user = Mock(pk=42, academy_id=aid, is_superuser=False)

        with patch('shared.authentication.schema_context') as schema_ctx:
            schema_ctx.return_value.__enter__.return_value = True
            schema_ctx.return_value.__exit__.return_value = False
            with patch(
                'shared.authentication.User.objects.get',
                side_effect=[User.DoesNotExist(), public_user],
            ):
                request = Mock()
                request.academy = academy
                result = self.auth.authenticate(request)

        self.assertEqual(result, (public_user, {'user_id': 42}))
        mock_super_auth.assert_not_called()

    def test_resolve_academy_from_header_returns_none_for_invalid_uuid(self):
        request = Mock()
        request.META = {'HTTP_X_ACADEMY_ID': 'invalid-uuid'}

        result = self.auth._resolve_academy_from_header(request)

        self.assertIsNone(result)

    def test_tenant_fallback_reads_token_from_header_bytes(self):
        request = Mock()
        request.META = {'HTTP_X_ACADEMY_ID': 'f402b420-5bdf-46ab-bbfa-819f67224680'}

        with patch.object(self.auth, '_resolve_academy_from_header', return_value=Mock()), \
             patch.object(self.auth, '_get_schema_name', return_value='tenant_test'), \
             patch.object(self.auth, 'get_header', return_value=b'Bearer token-123'), \
             patch.object(self.auth, 'get_raw_token', return_value=b'token-123') as get_raw, \
             patch.object(self.auth, 'get_validated_token', return_value={'user_id': 1}), \
             patch('shared.authentication.schema_context') as schema_ctx, \
             patch('shared.authentication.User.objects.get', return_value=Mock(id=1)):
            schema_ctx.return_value.__enter__.return_value = True
            schema_ctx.return_value.__exit__.return_value = False
            result = self.auth._authenticate_in_tenant_schema(request)

        self.assertIsNotNone(result)
        get_raw.assert_called_once_with(b'Bearer token-123')
