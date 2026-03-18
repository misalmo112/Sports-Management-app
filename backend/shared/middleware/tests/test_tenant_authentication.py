from django.test import SimpleTestCase
from rest_framework.exceptions import AuthenticationFailed
from unittest.mock import Mock, patch

from shared.authentication import TenantAwareJWTAuthentication


class TenantAwareJWTAuthenticationTest(SimpleTestCase):
    def setUp(self):
        self.auth = TenantAwareJWTAuthentication()

    @patch('rest_framework_simplejwt.authentication.JWTAuthentication.authenticate')
    def test_authenticate_falls_back_when_default_lookup_fails(self, mock_default_auth):
        request = Mock()
        mock_default_auth.side_effect = AuthenticationFailed('User not found')

        expected = ('tenant-user', 'validated-token')
        with patch.object(
            self.auth,
            '_authenticate_in_tenant_schema',
            return_value=expected,
        ) as tenant_fallback:
            result = self.auth.authenticate(request)

        self.assertEqual(result, expected)
        tenant_fallback.assert_called_once_with(request)

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
