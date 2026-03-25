"""
Cache key builders and invalidation helpers for quota-related caching.
"""
import logging

from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)
_CACHE_BACKEND_UNAVAILABLE = False

QUOTA_EFFECTIVE_KEY = "quota:effective:{academy_id}"
QUOTA_COUNT_USAGE_KEY = "quota:count_usage:{academy_id}:{quota_type}"

# Count usage cache TTL (R.5: extend from 120s to 300s).
QUOTA_COUNT_TTL = getattr(settings, "QUOTA_COUNT_TTL", 300)

COUNT_QUOTA_TYPES = ("students", "coaches", "classes", "admins")


def build_effective_quota_cache_key(academy_id):
    return QUOTA_EFFECTIVE_KEY.format(academy_id=academy_id)


def build_count_usage_cache_key(academy_id, quota_type):
    return QUOTA_COUNT_USAGE_KEY.format(academy_id=academy_id, quota_type=quota_type)


def invalidate_quota_cache(academy_id, quota_types=None):
    """
    Invalidate effective quota cache and count usage cache entries for an academy.
    """
    keys = [build_effective_quota_cache_key(academy_id)]
    selected_types = quota_types or COUNT_QUOTA_TYPES
    keys.extend(
        build_count_usage_cache_key(academy_id, quota_type)
        for quota_type in selected_types
    )
    safe_cache_delete_many(keys)


def safe_cache_get(key, default=None):
    global _CACHE_BACKEND_UNAVAILABLE
    if _CACHE_BACKEND_UNAVAILABLE:
        return default
    try:
        return cache.get(key, default)
    except Exception:
        _CACHE_BACKEND_UNAVAILABLE = True
        logger.warning("Quota cache backend unavailable on get; disabling quota cache operations.", exc_info=True)
        return default


def safe_cache_set(key, value, timeout=None):
    global _CACHE_BACKEND_UNAVAILABLE
    if _CACHE_BACKEND_UNAVAILABLE:
        return
    try:
        cache.set(key, value, timeout=timeout)
    except Exception:
        _CACHE_BACKEND_UNAVAILABLE = True
        logger.warning("Quota cache backend unavailable on set; disabling quota cache operations.", exc_info=True)


def safe_cache_delete_many(keys):
    global _CACHE_BACKEND_UNAVAILABLE
    if _CACHE_BACKEND_UNAVAILABLE:
        return
    try:
        cache.delete_many(keys)
    except Exception:
        _CACHE_BACKEND_UNAVAILABLE = True
        logger.warning("Quota cache backend unavailable on delete_many; disabling quota cache operations.", exc_info=True)
