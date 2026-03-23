"""
Cross-schema helpers for auth flows (invite, password reset).
Used by views and services to find users/tokens across tenant schemas.
"""
from django.db import connection
from django.db.utils import OperationalError, ProgrammingError
from django.utils import timezone
from shared.tenancy.schema import (
    build_schema_name,
    is_valid_schema_name,
    public_schema_context,
    schema_context,
)
from saas_platform.tenants.models import Academy
from tenant.users.models import User, InviteToken, PasswordResetToken


def _iter_postgres_tenant_schema_names():
    """
    Active academies may omit schema_name in DB; fall back to tenant_<uuidhex> like login/auth.
    Yields each distinct schema at most once.
    """
    seen = set()
    for academy in Academy.objects.filter(is_active=True).only('id', 'schema_name'):
        raw = (academy.schema_name or '').strip()
        if raw and is_valid_schema_name(raw):
            name = raw
        else:
            candidate = build_schema_name(academy.id)
            name = candidate if is_valid_schema_name(candidate) else None
        if name and name not in seen:
            seen.add(name)
            yield name


def _find_user_by_email_across_schemas(email):
    """
    Search all tenant schemas for an active user with the given email.
    Returns (user, schema_name) or (None, None).
    """
    email = (email or "").lower().strip()
    if not email:
        return None, None

    if connection.vendor != 'postgresql':
        user = User.objects.filter(email=email, is_active=True).first()
        return (user, None) if user else (None, None)

    try:
        with public_schema_context():
            user = User.objects.filter(email=email, is_active=True).first()
            if user:
                return user, None
    except (ProgrammingError, OperationalError):
        pass

    for schema_name in _iter_postgres_tenant_schema_names():
        with schema_context(schema_name) as active:
            if not active:
                continue
            user = User.objects.filter(email=email, is_active=True).first()
            if user:
                return user, schema_name
    return None, None


def _find_reset_token_across_schemas(plain_token):
    """
    Search all tenant schemas for an active password reset token matching plain_token.
    Returns (reset_token, schema_name) or (None, None).
    """
    if not plain_token:
        return None, None

    if connection.vendor != 'postgresql':
        active = PasswordResetToken.objects.filter(
            used_at__isnull=True,
            expires_at__gt=timezone.now(),
        ).select_related('user')
        for candidate in active:
            if PasswordResetToken.verify_token(candidate.token_hash, plain_token):
                return candidate, None
        return None, None

    try:
        with public_schema_context():
            tokens = PasswordResetToken.objects.filter(
                used_at__isnull=True,
                expires_at__gt=timezone.now(),
            ).select_related('user')
            for candidate in tokens:
                if PasswordResetToken.verify_token(candidate.token_hash, plain_token):
                    return candidate, None
    except (ProgrammingError, OperationalError):
        pass

    for schema_name in _iter_postgres_tenant_schema_names():
        with schema_context(schema_name) as active:
            if not active:
                continue
            tokens = PasswordResetToken.objects.filter(
                used_at__isnull=True,
                expires_at__gt=timezone.now(),
            ).select_related('user')
            for candidate in tokens:
                if PasswordResetToken.verify_token(candidate.token_hash, plain_token):
                    return candidate, schema_name
    return None, None


def _find_invite_token_across_schemas(plain_token):
    """
    Search all tenant schemas for an active invite token matching plain_token.
    Returns (invite_token, schema_name) or (None, None).
    """
    if not plain_token:
        return None, None

    if connection.vendor != 'postgresql':
        active = InviteToken.objects.filter(
            used_at__isnull=True,
            expires_at__gt=timezone.now(),
        ).select_related('user', 'academy')
        for candidate in active:
            if InviteToken.verify_token(candidate.token_hash, plain_token):
                return candidate, None
        return None, None

    try:
        with public_schema_context():
            tokens = InviteToken.objects.filter(
                used_at__isnull=True,
                expires_at__gt=timezone.now(),
            ).select_related('user', 'academy')
            for candidate in tokens:
                if InviteToken.verify_token(candidate.token_hash, plain_token):
                    return candidate, None
    except (ProgrammingError, OperationalError):
        pass

    for schema_name in _iter_postgres_tenant_schema_names():
        with schema_context(schema_name) as active:
            if not active:
                continue
            tokens = InviteToken.objects.filter(
                used_at__isnull=True,
                expires_at__gt=timezone.now(),
            ).select_related('user', 'academy')
            for candidate in tokens:
                if InviteToken.verify_token(candidate.token_hash, plain_token):
                    return candidate, schema_name
    return None, None
