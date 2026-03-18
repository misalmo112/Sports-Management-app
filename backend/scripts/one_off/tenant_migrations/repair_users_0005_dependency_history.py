"""
One-off repair: fix tenant schema migration history for users.0005 dependency.

Why:
Some tenant schemas were manually marked as having users.0005_password_reset_token
applied (workaround), but did not have users.0004_invitetoken_token_plain recorded.
That causes InconsistentMigrationHistory during tenant_migrate/tenant_setup_all.

What this does:
- For each tenant schema:
  - If users.0005 exists and users.0004 is missing, insert users.0004 with an
    applied timestamp just before users.0005.

Safe to re-run:
- Idempotent.
"""

from __future__ import annotations

import os
from datetime import timedelta

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.db import connection
from django.utils import timezone

from saas_platform.tenants.models import Academy


APP = "users"
M0004 = "0004_invitetoken_token_plain"
M0005 = "0005_password_reset_token"


def _get_applied(name: str) -> timezone.datetime | None:
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT applied FROM django_migrations WHERE app=%s AND name=%s",
            [APP, name],
        )
        row = cursor.fetchone()
        return row[0] if row else None


def _insert(name: str, applied: timezone.datetime) -> bool:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO django_migrations (app, name, applied)
            SELECT %s, %s, %s
            WHERE NOT EXISTS (
                SELECT 1 FROM django_migrations WHERE app=%s AND name=%s
            )
            """,
            [APP, name, applied, APP, name],
        )
        return cursor.rowcount > 0


def main() -> int:
    total = 0
    inserted = 0
    skipped = 0

    for academy in Academy.objects.filter(schema_name__isnull=False).exclude(schema_name=""):
        schema = academy.schema_name
        total += 1
        with connection.cursor() as cursor:
            cursor.execute("SET search_path TO %s, public", [schema])

        applied_0005 = _get_applied(M0005)
        applied_0004 = _get_applied(M0004)

        if applied_0005 and not applied_0004:
            desired = applied_0005 - timedelta(seconds=1)
            if _insert(M0004, desired):
                inserted += 1
                print(f"[{schema}] inserted {APP}.{M0004} @ {desired.isoformat()}")
            else:
                skipped += 1
                print(f"[{schema}] ok (race/no change)")
        else:
            skipped += 1
            print(f"[{schema}] ok (no change)")

    with connection.cursor() as cursor:
        cursor.execute("SET search_path TO public")

    print(f"Done. schemas={total} inserted={inserted} skipped={skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

