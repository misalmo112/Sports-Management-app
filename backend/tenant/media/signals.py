from __future__ import annotations

from django.db.models import Sum
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from saas_platform.quotas.models import TenantUsage
from tenant.media.models import MediaFile


def _recompute_storage_used_bytes(*, academy_id) -> None:
    storage_used = (
        MediaFile.objects.filter(academy_id=academy_id, is_active=True)
        .aggregate(total=Sum("file_size"))
        .get("total")
        or 0
    )

    usage, _created = TenantUsage.objects.get_or_create(academy_id=academy_id)
    # Use QuerySet.update() (no save()) to avoid accidental recursion.
    TenantUsage.objects.filter(pk=usage.pk).update(storage_used_bytes=storage_used)


@receiver(post_save, sender=MediaFile, dispatch_uid="tenant_media_storage_recompute_post_save")
def tenant_media_recompute_storage_on_save(sender, instance: MediaFile, **_kwargs) -> None:
    # Always recompute from live active media rows so storage is correct even if:
    # - is_active flips (soft-delete/reactivation)
    # - file_size changes
    _recompute_storage_used_bytes(academy_id=instance.academy_id)


@receiver(post_delete, sender=MediaFile, dispatch_uid="tenant_media_storage_recompute_post_delete")
def tenant_media_recompute_storage_on_delete(sender, instance: MediaFile, **_kwargs) -> None:
    # Post-delete: the row is already gone, so Sum('file_size') reflects the updated state.
    _recompute_storage_used_bytes(academy_id=instance.academy_id)

