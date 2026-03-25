from __future__ import annotations

import logging

from celery import shared_task
from django.db.models import Sum
from django.core.cache import cache

from saas_platform.analytics.services import StatsService
from saas_platform.quotas.models import StorageSnapshot, TenantUsage
from saas_platform.tenants.models import Academy
from shared.tenancy.schema import build_schema_name, schema_context
from tenant.media.models import MediaFile

logger = logging.getLogger(__name__)


@shared_task(name="quotas.reconcile_all_storage")
def reconcile_all_storage() -> None:
    """
    Safety-net reconciliation task for tenant storage quota usage.

    Recomputes TenantUsage.storage_used_bytes from live MediaFile rows where:
    - MediaFile.is_active=True
    """

    active_academies = Academy.objects.filter(is_active=True).only("id", "schema_name", "name")
    for academy in active_academies:
        schema_name = getattr(academy, "schema_name", None) or build_schema_name(academy.id)

        # For sqlite/non-Postgres this context is effectively a no-op, but kept for
        # correctness in the real multi-schema deployment.
        with schema_context(schema_name):
            # Best-effort: if tenant schema is not present, queries will run in the
            # current search_path (often `public`). If the tenant table also doesn't
            # exist there, we fall back to 0 but never crash.
            try:
                storage_used_bytes = (
                    MediaFile.objects.filter(academy_id=academy.id, is_active=True)
                    .aggregate(total=Sum("file_size"))
                    .get("total")
                    or 0
                )
            except Exception:
                logger.warning(
                    "Failed to reconcile storage from MediaFile for academy_id=%s (schema=%s); using 0.",
                    academy.id,
                    schema_name,
                    exc_info=True,
                )
                storage_used_bytes = 0

        usage, _created = TenantUsage.objects.get_or_create(academy=academy)
        if usage.storage_used_bytes != storage_used_bytes:
            TenantUsage.objects.filter(pk=usage.pk).update(storage_used_bytes=storage_used_bytes)

        # Invalidate per-academy DB size cache after usage recomputation.
        try:
            cache.delete(f"db_size_bytes:{academy.id}")
        except Exception:
            logger.debug(
                "Failed to invalidate db-size cache for academy_id=%s",
                academy.id,
                exc_info=True,
            )


@shared_task(name="quotas.snapshot_all_storage")
def snapshot_all_storage() -> None:
    """
    Snapshot storage usage + estimated academy DB size for all active academies.
    """
    active_academies = Academy.objects.filter(is_active=True).only("id")
    snapshots: list[StorageSnapshot] = []

    for academy in active_academies:
        usage = TenantUsage.objects.filter(academy_id=academy.id).first()
        if usage is None:
            logger.warning(
                "Missing TenantUsage for academy_id=%s; skipping storage snapshot.",
                academy.id,
            )
            continue

        db_size_bytes = StatsService.get_academy_db_size_bytes(academy.id)
        total_bytes = (usage.storage_used_bytes or 0) + (db_size_bytes or 0)

        snapshots.append(
            StorageSnapshot(
                academy=academy,
                storage_used_bytes=usage.storage_used_bytes or 0,
                db_size_bytes=db_size_bytes or 0,
                total_bytes=total_bytes,
            )
        )

    if snapshots:
        StorageSnapshot.objects.bulk_create(snapshots)

