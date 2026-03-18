"""
Cross-schema helpers for auth flows (invite, password reset).
Used by views and services to find users/tokens across tenant schemas.
"""
from django.db import connection
from django.utils import timezone
from shared.tenancy.schema import schema_context
from saas_platform.tenants.models import Academy
from tenant.users.models import User, InviteToken, PasswordResetToken


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

    for schema_name in Academy.objects.filter(
        is_active=True,
        schema_name__isnull=False,
    ).values_list('schema_name', flat=True):
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

    for schema_name in Academy.objects.filter(
        is_active=True,
        schema_name__isnull=False,
    ).values_list('schema_name', flat=True):
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

    for schema_name in Academy.objects.filter(
        is_active=True,
        schema_name__isnull=False,
    ).values_list('schema_name', flat=True):
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
