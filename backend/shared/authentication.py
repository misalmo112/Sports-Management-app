"""
Custom authentication for tenant-aware JWT.

When the default User lookup fails (e.g. user lives in a tenant schema and
TENANT_SCHEMA_ROUTING is false), retries the lookup in the academy's schema
if X-Academy-ID is present and request.academy is set by middleware.
"""
import logging
import uuid
from django.contrib.auth import get_user_model
from django.db import connection
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from shared.tenancy.schema import schema_context, is_valid_schema_name, build_schema_name
from saas_platform.tenants.models import Academy

User = get_user_model()
logger = logging.getLogger(__name__)


class TenantAwareJWTAuthentication(JWTAuthentication):
    """
    JWT authentication that prefers the tenant schema when the request is scoped
    to an academy with a Postgres schema (X-Academy-ID / request.academy).

    Default SimpleJWT + public search_path can return a user whose pk exists only
    in public (e.g. id=1), while ORM writes use the tenant schema — then FKs like
    InviteToken.created_by fail with "User instance with id … does not exist."
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None
        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None
        try:
            validated_token = self.get_validated_token(raw_token)
        except (InvalidToken, AuthenticationFailed):
            return None

        user_id_claim = getattr(self, 'user_id_claim', 'user_id')
        user_id = validated_token.get(user_id_claim)
        if not user_id:
            return None

        academy = getattr(request, 'academy', None) or self._resolve_academy_from_header(request)
        schema_name = self._get_schema_name(academy) if academy else None

        if schema_name and connection.vendor == 'postgresql':
            entered = False
            tenant_user = None
            with schema_context(schema_name) as ctx_ok:
                entered = bool(ctx_ok)
                if ctx_ok:
                    try:
                        tenant_user = User.objects.get(pk=user_id)
                    except User.DoesNotExist:
                        tenant_user = None
            if entered:
                if tenant_user is not None:
                    if (
                        tenant_user.academy_id is not None
                        and tenant_user.academy_id != academy.id
                    ):
                        return None
                    return tenant_user, validated_token
                try:
                    public_user = User.objects.get(pk=user_id)
                except User.DoesNotExist:
                    return None
                if public_user.is_superuser and public_user.academy_id is None:
                    return public_user, validated_token
                # Users may exist only in public while academy still has a tenant_* schema
                # (e.g. TENANT_SCHEMA_ROUTING off). Allow if they belong to this academy.
                pub_aid = getattr(public_user, 'academy_id', None)
                if pub_aid is not None and pub_aid == academy.id:
                    return public_user, validated_token
                return None

        try:
            return super().authenticate(request)
        except (InvalidToken, User.DoesNotExist, AuthenticationFailed):
            return None

    def _authenticate_default(self, request):
        """Run standard JWT auth (decode token, get user by id in current schema)."""
        try:
            return super().authenticate(request)
        except (InvalidToken, User.DoesNotExist, AuthenticationFailed):
            return None

    def _resolve_academy_from_header(self, request):
        """
        Resolve academy directly from X-Academy-ID.
        This is needed because middleware runs before DRF auth, so request.academy
        may be unset even when the header is present.
        """
        header_value = request.META.get('HTTP_X_ACADEMY_ID')
        if not header_value:
            return None
        try:
            academy_id = uuid.UUID(header_value.strip())
        except (ValueError, AttributeError):
            return None
        try:
            return Academy.objects.get(id=academy_id, is_active=True)
        except Academy.DoesNotExist:
            return None

    def _get_schema_name(self, academy):
        """Resolve tenant schema name (stored or built from academy id)."""
        schema_name = getattr(academy, 'schema_name', None)
        if schema_name and is_valid_schema_name(schema_name):
            return schema_name
        if academy and connection.vendor == 'postgresql':
            candidate = build_schema_name(academy.id)
            if is_valid_schema_name(candidate):
                return candidate
        return None

    def _authenticate_in_tenant_schema(self, request):
        """
        If request.academy is set (from X-Academy-ID) and has a schema,
        try to load the user from that schema.
        """
        academy = getattr(request, 'academy', None)
        if not academy:
            academy = self._resolve_academy_from_header(request)
        if not academy:
            return None
        schema_name = self._get_schema_name(academy)
        if not schema_name:
            return None

        header = self.get_header(request)
        # SimpleJWT expects a string header; if the request has no auth header
        # we must return None (e.g. token obtain endpoints).
        if header is None:
            return None
        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None
        validated_token = self.get_validated_token(raw_token)
        user_id_claim = getattr(self, 'user_id_claim', 'user_id')
        user_id = validated_token.get(user_id_claim)
        if not user_id:
            return None

        try:
            with schema_context(schema_name) as ctx_ok:
                if not ctx_ok:
                    return None
                user = User.objects.get(pk=user_id)
                return (user, validated_token)
        except User.DoesNotExist:
            logger.debug(
                "User %s not found in schema %s",
                user_id,
                schema_name,
                extra={'academy_id': str(academy.id)},
            )
            return None
