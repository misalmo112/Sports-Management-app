"""
Canonical tenant dashboard module keys (aligned with frontend nav item ids under ADMIN).

Role enum STAFF is unrelated to module key "staff" (Management → Staff page).
"""

# All grantable module keys (v1)
TENANT_MODULE_KEYS = frozenset(
    {
        "admin-overview",
        "students",
        "classes",
        "attendance",
        "finance-items",
        "invoices",
        "receipts",
        "users",
        "media",
        "reports",
        "finance-overview",
        "facilities",
        "staff",
        "feedback",
        "settings-home",
        "organization-settings",
        "tax-settings",
        "locations",
        "academy-settings",
        "usage-settings",
        "sports",
        "terms",
        "currencies",
        "timezones",
        "bulk-actions",
        "setup",
    }
)

# Keys that must never appear in STAFF allowed_modules (defense in depth)
FORBIDDEN_STAFF_MODULES = frozenset({"users", "academy-settings", "bulk-actions"})


def validate_allowed_modules_for_staff(modules: list | None) -> None:
    """
    Raise ValidationError if modules are invalid for role STAFF.
    STAFF requires a non-empty list of known keys with no forbidden entries.
    """
    from django.core.exceptions import ValidationError

    if modules is None:
        raise ValidationError({"allowed_modules": "STAFF users must have allowed_modules set."})
    if not isinstance(modules, list):
        raise ValidationError({"allowed_modules": "allowed_modules must be a list of strings."})
    if len(modules) == 0:
        raise ValidationError({"allowed_modules": "Select at least one module for STAFF users."})
    for key in modules:
        if not isinstance(key, str):
            raise ValidationError({"allowed_modules": "Each module must be a string key."})
        if key not in TENANT_MODULE_KEYS:
            raise ValidationError({"allowed_modules": f"Unknown module key: {key}"})
    forbidden = set(modules) & FORBIDDEN_STAFF_MODULES
    if forbidden:
        raise ValidationError(
            {"allowed_modules": f"These modules cannot be granted to STAFF: {sorted(forbidden)}"}
        )
