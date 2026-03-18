"""
Sync platform masters from external APIs: Frankfurter (currencies + exchange rates)
and WorldTimeAPI (timezones).
"""
import logging
from datetime import date
from decimal import Decimal

import requests
from django.conf import settings
from django.db import models
from django.utils import timezone

from saas_platform.masters.models import Currency, ExchangeRate, Timezone

logger = logging.getLogger(__name__)

# Settings with defaults
FRANKFURTER_BASE_URL = getattr(
    settings, "FRANKFURTER_BASE_URL", "https://api.frankfurter.dev"
)
FRANKFURTER_RATE_BASES = getattr(settings, "FRANKFURTER_RATE_BASES", ["EUR"])
WORLDTIMEAPI_BASE_URL = getattr(
    settings, "WORLDTIMEAPI_BASE_URL", "http://worldtimeapi.org/api"
)


def sync_currencies_from_frankfurter():
    """
    Fetch currency list from Frankfurter and upsert into platform_currencies.
    Does not delete or deactivate existing currencies (academies/plans may reference them).
    """
    url = f"{FRANKFURTER_BASE_URL.rstrip('/')}/currencies"
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        logger.exception("Frankfurter currencies fetch failed: %s", e)
        raise

    if not isinstance(data, dict):
        logger.warning("Frankfurter currencies response was not a dict: %s", type(data))
        return

    updated = 0
    created = 0
    for code, name in data.items():
        if not code or len(code) != 3:
            continue
        obj, created_flag = Currency.objects.update_or_create(
            code=code.upper(),
            defaults={
                "name": (name or "")[:100],
                "is_active": True,
            },
        )
        if created_flag:
            created += 1
        else:
            updated += 1

    logger.info(
        "Frankfurter currencies sync: %d created, %d updated",
        created,
        updated,
    )


def sync_exchange_rates_from_frankfurter():
    """
    Fetch latest exchange rates from Frankfurter for configured base currencies
    and store in platform_exchange_rates.
    """
    bases = FRANKFURTER_RATE_BASES if FRANKFURTER_RATE_BASES else ["EUR"]
    now = timezone.now()

    for base in bases:
        url = f"{FRANKFURTER_BASE_URL.rstrip('/')}/latest"
        try:
            resp = requests.get(url, params={"base": base}, timeout=30)
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException as e:
            logger.exception(
                "Frankfurter latest rates fetch failed for base=%s: %s",
                base,
                e,
            )
            continue

        base_curr = (data.get("base") or base).upper()
        rate_date_str = data.get("date")
        rates = data.get("rates")
        if not rate_date_str or not isinstance(rates, dict):
            logger.warning(
                "Frankfurter latest response missing date or rates: base=%s",
                base_curr,
            )
            continue

        try:
            rate_date = date.fromisoformat(rate_date_str)
        except (TypeError, ValueError):
            logger.warning(
                "Frankfurter date invalid: %s",
                rate_date_str,
            )
            continue

        stored = 0
        for curr, val in rates.items():
            if not curr or len(curr) != 3:
                continue
            try:
                rate_value = Decimal(str(val))
            except Exception:
                continue
            _, created = ExchangeRate.objects.update_or_create(
                base_currency=base_curr,
                currency=curr.upper(),
                date=rate_date,
                defaults={
                    "rate": rate_value,
                    "fetched_at": now,
                },
            )
            if created:
                stored += 1
            else:
                stored += 1

        logger.info(
            "Frankfurter rates sync: base=%s date=%s stored=%d",
            base_curr,
            rate_date,
            stored,
        )


def sync_currencies_and_rates_from_frankfurter():
    """
    Run both currency list and exchange rate sync. Catches and logs errors
    so one failure does not block the other.
    """
    try:
        sync_currencies_from_frankfurter()
    except Exception as e:
        logger.exception("Frankfurter currencies sync failed: %s", e)

    try:
        sync_exchange_rates_from_frankfurter()
    except Exception as e:
        logger.exception("Frankfurter exchange rates sync failed: %s", e)


def sync_timezones_from_worldtimeapi():
    """
    Fetch timezone list from WorldTimeAPI and add any missing IANA codes
    to platform_timezones. Does not delete or deactivate existing timezones.
    """
    url = f"{WORLDTIMEAPI_BASE_URL.rstrip('/')}/timezone"
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        logger.exception("WorldTimeAPI timezone list fetch failed: %s", e)
        raise

    if not isinstance(data, list):
        logger.warning(
            "WorldTimeAPI timezone response was not a list: %s",
            type(data),
        )
        return

    existing = set(
        Timezone.objects.values_list("code", flat=True),
    )
    created = 0
    max_sort = (
        Timezone.objects.aggregate(
            mx=models.Max("sort_order"),
        ).get("mx") or 0
    )

    for code in data:
        if not code or not isinstance(code, str) or len(code) > 63:
            continue
        if code in existing:
            continue
        # Optional: derive display name from "Area/Location" -> "Location"
        name = ""
        if "/" in code:
            name = code.split("/")[-1].replace("_", " ")
        max_sort += 1
        Timezone.objects.create(
            code=code,
            name=name[:100] if name else "",
            is_active=True,
            sort_order=max_sort,
        )
        created += 1
        existing.add(code)

    logger.info(
        "WorldTimeAPI timezones sync: %d new timezones added",
        created,
    )
