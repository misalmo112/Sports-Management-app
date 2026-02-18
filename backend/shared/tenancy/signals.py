"""Signals for dual-write during schema migration."""

from django.apps import apps
from django.db.models.signals import post_save, post_delete
from shared.tenancy.dual_write import upsert_to_public, delete_from_public


def _eligible_model(model):
    return (
        model._meta.managed
        and model._meta.db_table.startswith('tenant_')
    )


def register_dual_write_signals():
    for model in apps.get_models():
        if not _eligible_model(model):
            continue

        post_save.connect(
            _handle_post_save,
            sender=model,
            dispatch_uid=f'dual_write_post_save_{model._meta.label_lower}',
        )
        post_delete.connect(
            _handle_post_delete,
            sender=model,
            dispatch_uid=f'dual_write_post_delete_{model._meta.label_lower}',
        )


def _handle_post_save(sender, instance, **kwargs):
    upsert_to_public(instance)


def _handle_post_delete(sender, instance, **kwargs):
    delete_from_public(instance)
