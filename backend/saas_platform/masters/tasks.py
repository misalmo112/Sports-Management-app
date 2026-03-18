"""
Celery tasks for syncing platform masters from Frankfurter and WorldTimeAPI.
"""
import logging

from celery import shared_task

from saas_platform.masters.services import (
    sync_currencies_and_rates_from_frankfurter,
    sync_timezones_from_worldtimeapi,
)

logger = logging.getLogger(__name__)


@shared_task
def sync_currencies_and_rates_from_frankfurter_task():
    """
    Sync currency list and latest exchange rates from Frankfurter.
    Intended to run daily (e.g. after ECB update ~17:00 UTC).
    """
    try:
        sync_currencies_and_rates_from_frankfurter()
    except Exception as e:
        logger.exception("Frankfurter sync task failed: %s", e)
        raise


@shared_task
def sync_timezones_from_worldtimeapi_task():
    """
    Sync timezone list from WorldTimeAPI (add new IANA zones).
    Intended to run weekly.
    """
    try:
        sync_timezones_from_worldtimeapi()
    except Exception as e:
        logger.exception("WorldTimeAPI sync task failed: %s", e)
        raise
