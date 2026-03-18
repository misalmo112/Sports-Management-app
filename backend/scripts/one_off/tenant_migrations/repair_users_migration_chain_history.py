"""
One-off repair: fix tenant schema users migration chain ordering.

Why:
Some tenant schemas were manually marked with later users migrations applied
(e.g. users.0005) but are missing earlier dependencies (0001-0004) in their
schema-local django_migrations, causing InconsistentMigrationHistory.

What this does:
- For each tenant schema:
  - Ensures a consistent applied chain for users.0001..users.0005
  - Inserts missing rows and backdates applied timestamps so that:
      applied(0001) < applied(0002) < applied(0003) < applied(0004) < applied(0005)

Safe to re-run:
- Idempotent; may adjust timestamps earlier to satisfy ordering.
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
CHAIN = [
    "0001_initial",
    "0002_coachprofile_location",
    "0003_make_academy_nullable_for_superusers",
    "0004_invitetoken_token_plain",
    "0005_password_reset_token",
]


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


def _update(name: str, applied: timezone.datetime) -> bool:
    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE django_migrations SET applied=%s WHERE app=%s AND name=%s",
            [applied, APP, name],
        )
        return cursor.rowcount > 0


def main() -> int:
    total = 0
    inserted = 0
    updated = 0
    skipped = 0

    for academy in Academy.objects.filter(schema_name__isnull=False).exclude(schema_name=""):
        schema = academy.schema_name
        total += 1
        with connection.cursor() as cursor:
            cursor.execute("SET search_path TO %s, public", [schema])

        # Anchor: use existing applied timestamp for the latest present migration in CHAIN.
        anchor = None
        for name in reversed(CHAIN):
            anchor = _get_applied(name)
            if anchor:
                break
        if not anchor:
            skipped += 1
            print(f"[{schema}] skipped (no {APP} migrations present)")
            continue

        # Build desired times backwards from anchor.
        desired: dict[str, timezone.datetime] = {}
        t = anchor
        for name in reversed(CHAIN):
            desired[name] = t
            t = t - timedelta(seconds=1)

        changed = False
        for name in CHAIN:
            current = _get_applied(name)
            if not current:
                if _insert(name, desired[name]):
                    inserted += 1
                    changed = True
            else:
                # If current is not strictly before the next migration, backdate it.
                next_idx = CHAIN.index(name) + 1
                if next_idx < len(CHAIN):
                    next_applied = _get_applied(CHAIN[next_idx])
                    if next_applied and current >= next_applied:
                        _update(name, desired[name])
                        updated += 1
                        changed = True

        if changed:
            print(f"[{schema}] repaired (inserted/updated)")
        else:
            print(f"[{schema}] ok (no change)")

    with connection.cursor() as cursor:
        cursor.execute("SET search_path TO public")

    print(f"Done. schemas={total} inserted={inserted} updated={updated} skipped={skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

