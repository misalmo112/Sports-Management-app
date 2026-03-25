"""
Quota cache invalidation signals (Phase R.5 - count usage caches).

Audit findings (create/delete/soft-delete/reaction patterns):
- `StudentViewSet.perform_destroy()` soft-deletes students by flipping `is_active=False` and saving.
- `CoachViewSet.perform_destroy()` soft-deletes coaches by flipping `is_active=False` and saving.
- `ClassViewSet.perform_destroy()` hard-deletes classes via `instance.delete()` (but we still support `is_active` flips for safety/tests).
- `UserViewSet.perform_destroy()` soft-deletes users by flipping `is_active=False` and saving.

Implementation notes:
- Soft-delete/reactivation is handled via `pre_save` when `is_active` flips.
- `admins` count membership is determined by `(User.is_active=True) AND (User.role in {OWNER, ADMIN, STAFF})`.
- `pre_save` invalidates when either `is_active` or `role` changes membership (including ADMIN <-> non-admin roles).
"""

import logging

from django.contrib.auth import get_user_model
from django.db.models.signals import pre_save, post_delete, post_save

from shared.cache_keys import invalidate_quota_cache
from tenant.classes.models import Class
from tenant.coaches.models import Coach
from tenant.students.models import Student

logger = logging.getLogger(__name__)


def _safe_invalidate(academy_id, quota_types, context):
    """
    Invalidate quota caches without letting signal exceptions propagate.

    Requirement: signal handlers must not propagate errors; wrap invalidation in try/except and log WARNING.
    """
    try:
        if academy_id:
            invalidate_quota_cache(academy_id, quota_types=quota_types)
    except Exception as exc:
        logger.warning(
            "Quota cache invalidation failed (%s) for academy_id=%s quota_types=%s: %s",
            context,
            academy_id,
            quota_types,
            exc,
            exc_info=True,
        )


def _should_skip_update(kwargs, field_names):
    """
    Best-effort optimization: if `update_fields` is supplied and doesn't include fields of interest, skip work.
    """
    update_fields = kwargs.get("update_fields")
    if update_fields is None:
        return False
    return not any(f in update_fields for f in field_names)


def _invalidate_on_is_active_flip(sender, instance, quota_type, pre_save_kwargs):
    if not instance.pk:
        return
    if _should_skip_update(pre_save_kwargs, ["is_active"]):
        return

    try:
        old = sender.objects.only("id", "academy_id", "is_active").get(pk=instance.pk)
    except sender.DoesNotExist:
        return
    except Exception:
        # If we can't inspect the previous state, avoid breaking the save path.
        logger.warning(
            "Quota cache pre_save inspection failed for %s id=%s",
            sender.__name__,
            instance.pk,
            exc_info=True,
        )
        return

    if old.is_active == instance.is_active:
        return

    _safe_invalidate(instance.academy_id, quota_types=(quota_type,), context="is_active_flip")


def register_quota_cache_invalidation_signals():
    # Student
    pre_save.connect(
        _invalidate_student_on_is_active_change,
        sender=Student,
        dispatch_uid="quota_cache_pre_save_student_is_active_flip",
    )
    post_save.connect(
        _invalidate_student_on_create,
        sender=Student,
        dispatch_uid="quota_cache_post_save_student_create",
    )
    post_delete.connect(
        _invalidate_student_on_delete,
        sender=Student,
        dispatch_uid="quota_cache_post_delete_student_delete",
    )

    # Coach
    pre_save.connect(
        _invalidate_coach_on_is_active_change,
        sender=Coach,
        dispatch_uid="quota_cache_pre_save_coach_is_active_flip",
    )
    post_save.connect(
        _invalidate_coach_on_create,
        sender=Coach,
        dispatch_uid="quota_cache_post_save_coach_create",
    )
    post_delete.connect(
        _invalidate_coach_on_delete,
        sender=Coach,
        dispatch_uid="quota_cache_post_delete_coach_delete",
    )

    # Class
    pre_save.connect(
        _invalidate_class_on_is_active_change,
        sender=Class,
        dispatch_uid="quota_cache_pre_save_class_is_active_flip",
    )
    post_save.connect(
        _invalidate_class_on_create,
        sender=Class,
        dispatch_uid="quota_cache_post_save_class_create",
    )
    post_delete.connect(
        _invalidate_class_on_delete,
        sender=Class,
        dispatch_uid="quota_cache_post_delete_class_delete",
    )

    # User (admins count usage cache)
    User = get_user_model()
    pre_save.connect(
        _invalidate_user_admins_on_is_active_and_role_change,
        sender=User,
        dispatch_uid="quota_cache_pre_save_user_admins_is_active_role_change",
    )
    post_save.connect(
        _invalidate_user_admins_on_create,
        sender=User,
        dispatch_uid="quota_cache_post_save_user_admins_create",
    )
    post_delete.connect(
        _invalidate_user_admins_on_delete,
        sender=User,
        dispatch_uid="quota_cache_post_delete_user_admins_delete",
    )


def _invalidate_student_on_is_active_change(sender, instance, **kwargs):
    _invalidate_on_is_active_flip(sender, instance, quota_type="students", pre_save_kwargs=kwargs)


def _invalidate_coach_on_is_active_change(sender, instance, **kwargs):
    _invalidate_on_is_active_flip(sender, instance, quota_type="coaches", pre_save_kwargs=kwargs)


def _invalidate_class_on_is_active_change(sender, instance, **kwargs):
    _invalidate_on_is_active_flip(sender, instance, quota_type="classes", pre_save_kwargs=kwargs)


def _invalidate_student_on_create(sender, instance, **kwargs):
    created = kwargs.get("created", False)
    if created and instance.is_active:
        _safe_invalidate(instance.academy_id, quota_types=("students",), context="student_create_active")


def _invalidate_coach_on_create(sender, instance, **kwargs):
    created = kwargs.get("created", False)
    if created and instance.is_active:
        _safe_invalidate(instance.academy_id, quota_types=("coaches",), context="coach_create_active")


def _invalidate_class_on_create(sender, instance, **kwargs):
    created = kwargs.get("created", False)
    if created and instance.is_active:
        _safe_invalidate(instance.academy_id, quota_types=("classes",), context="class_create_active")


def _invalidate_student_on_delete(sender, instance, **kwargs):
    if instance.is_active:
        _safe_invalidate(instance.academy_id, quota_types=("students",), context="student_hard_delete")


def _invalidate_coach_on_delete(sender, instance, **kwargs):
    if instance.is_active:
        _safe_invalidate(instance.academy_id, quota_types=("coaches",), context="coach_hard_delete")


def _invalidate_class_on_delete(sender, instance, **kwargs):
    if instance.is_active:
        _safe_invalidate(instance.academy_id, quota_types=("classes",), context="class_hard_delete")


def _invalidate_user_admins_on_is_active_and_role_change(sender, instance, **kwargs):
    """
    Invalidate `admins` count usage cache when:
    - `User.is_active` flips (soft-delete/reactivation) for users that count towards admins usage.
    - `User.role` changes such that it starts/stops counting towards admins usage.
    """
    if not instance.pk:
        return

    if _should_skip_update(kwargs, ["is_active", "role"]):
        return

    try:
        old = sender.objects.only("id", "academy_id", "is_active", "role").get(pk=instance.pk)
    except sender.DoesNotExist:
        return
    except Exception:
        logger.warning(
            "Quota cache pre_save inspection failed for User id=%s",
            instance.pk,
            exc_info=True,
        )
        return

    # Count usage includes: OWNER/ADMIN/STAFF (see shared/services/quota.py)
    admin_quota_roles = {instance.Role.OWNER, instance.Role.ADMIN, instance.Role.STAFF}

    old_counts_towards_admins = bool(old.is_active) and old.role in admin_quota_roles
    new_counts_towards_admins = bool(instance.is_active) and instance.role in admin_quota_roles

    # Invalidate only when the cached "admins" count query would change.
    if old_counts_towards_admins != new_counts_towards_admins:
        _safe_invalidate(instance.academy_id, quota_types=("admins",), context="user_is_active_or_role_change")


def _invalidate_user_admins_on_create(sender, instance, **kwargs):
    created = kwargs.get("created", False)
    if not created:
        return

    admin_quota_roles = {instance.Role.OWNER, instance.Role.ADMIN, instance.Role.STAFF}
    if instance.academy_id and instance.is_active and instance.role in admin_quota_roles:
        _safe_invalidate(instance.academy_id, quota_types=("admins",), context="user_create_active")


def _invalidate_user_admins_on_delete(sender, instance, **kwargs):
    admin_quota_roles = {instance.Role.OWNER, instance.Role.ADMIN, instance.Role.STAFF}
    if instance.academy_id and instance.is_active and instance.role in admin_quota_roles:
        _safe_invalidate(instance.academy_id, quota_types=("admins",), context="user_hard_delete")
