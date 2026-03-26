from __future__ import annotations

import re
from typing import Optional


COUNTRY_DIAL_CODES: dict[str, str] = {
    # GCC (ISO alpha-3 -> dial code)
    "ARE": "971",  # United Arab Emirates
    "SAU": "966",  # Saudi Arabia
    "QAT": "974",  # Qatar
    "BHR": "973",  # Bahrain
    "KWT": "965",  # Kuwait
    "OMN": "968",  # Oman
}


def normalize_to_e164(phone: str, academy_country: str = "ARE") -> str | None:
    """
    Normalize GCC phone formats to E.164.

    Supported inputs:
    - Already E.164: +971501234567
    - International with 00: 00971501234567
    - Local with leading 0: 0501234567
    - Bare UAE mobile (no leading 0): 501234567
    - Strips non-digit chars except a leading '+'.
    """

    if phone is None:
        return None

    country_code = COUNTRY_DIAL_CODES.get((academy_country or "ARE").upper())
    if not country_code:
        return None

    raw = str(phone).strip()
    if not raw:
        return None

    # Keep a leading '+' if it exists; remove everything else to digits.
    if raw.startswith("+"):
        digits = re.sub(r"\D", "", raw[1:])
        if not digits:
            return None
        if 8 <= len(digits) <= 15:
            return f"+{digits}"
        return None

    digits = re.sub(r"\D", "", raw)
    if not digits:
        return None

    # International dialing prefix: 00xxxx -> +xxxx
    if digits.startswith("00"):
        without_00 = digits[2:]
        if without_00.startswith(country_code):
            return f"+{without_00}"
        return None

    # If already has dial code but no '+', accept as E.164 without plus.
    if digits.startswith(country_code) and len(digits) > len(country_code):
        return f"+{digits}"

    # Local with trunk prefix: 0XXXXXXXX -> +<dial_code>XXXXXXXX
    if digits.startswith("0"):
        local = digits.lstrip("0")
        if not local:
            return None
        return f"+{country_code}{local}"

    # Bare number (e.g. UAE mobile): 501234567 -> +971501234567
    # Basic sanity: avoid treating very short/very long strings as real numbers.
    if not (7 <= len(digits) <= 10):
        return None
    return f"+{country_code}{digits}"

