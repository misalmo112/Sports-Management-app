"""
One-off repair: fix tenant schema migration history ordering.

Why:
Some tenant schemas recorded tenant app migrations (e.g. facilities.0001_initial)
as applied before its dependency tenants.0005_ensure_academy_currency, causing:
InconsistentMigrationHistory on tenant_migrate / tenant_setup_all.

What this does:
- For each tenant schema (Academy.schema_name):
  - Ensures ('tenants','0005_ensure_academy_currency') exists in <schema>.django_migrations
  - Ensures its applied timestamp is earlier than known dependent migrations

Safe to re-run:
- Idempotent. It only inserts missing rows and may backdate the applied timestamp
  when necessary to satisfy dependency ordering.
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


TARGET_APP = "tenants"
TARGET_NAME = "0005_ensure_academy_currency"

# Known dependents that may already be applied in tenant schemas.
DEPENDENTS: list[tuple[str, str]] = [
    ("facilities", "0001_initial"),
]


def _min_dependent_applied() -> timezone.datetime | None:
    placeholders = ", ".join(["(%s, %s)"] * len(DEPENDENTS))
    params: list[str] = []
    for app, name in DEPENDENTS:
        params.extend([app, name])
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT MIN(applied)
            FROM django_migrations
            WHERE (app, name) IN ({placeholders})
            """,
            params,
        )
        row = cursor.fetchone()
        return row[0] if row else None


def _get_target_applied() -> timezone.datetime | None:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT applied
            FROM django_migrations
            WHERE app = %s AND name = %s
            """,
            [TARGET_APP, TARGET_NAME],
        )
        row = cursor.fetchone()
        return row[0] if row else None


def _ensure_row(applied: timezone.datetime) -> str:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO django_migrations (app, name, applied)
            SELECT %s, %s, %s
            WHERE NOT EXISTS (
                SELECT 1 FROM django_migrations WHERE app = %s AND name = %s
            )
            """,
            [TARGET_APP, TARGET_NAME, applied, TARGET_APP, TARGET_NAME],
        )
        return "inserted" if cursor.rowcount else "exists"


def _update_applied(applied: timezone.datetime) -> bool:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE django_migrations
            SET applied = %s
            WHERE app = %s AND name = %s
            """,
            [applied, TARGET_APP, TARGET_NAME],
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

        min_dep = _min_dependent_applied()
        desired = (min_dep - timedelta(seconds=1)) if min_dep else timezone.now()

        state = _ensure_row(desired)
        if state == "inserted":
            inserted += 1
            print(f"[{schema}] inserted {TARGET_APP}.{TARGET_NAME} @ {desired.isoformat()}")
            continue

        current = _get_target_applied()
        if min_dep and current and current >= min_dep:
            _update_applied(desired)
            updated += 1
            print(f"[{schema}] updated {TARGET_APP}.{TARGET_NAME}: {current.isoformat()} -> {desired.isoformat()}")
        else:
            skipped += 1
            print(f"[{schema}] ok (no change)")

    with connection.cursor() as cursor:
        cursor.execute("SET search_path TO public")

    print(
        f"Done. schemas={total} inserted={inserted} updated={updated} skipped={skipped} "
        f"dependents={','.join([f'{a}.{n}' for a, n in DEPENDENTS])}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

