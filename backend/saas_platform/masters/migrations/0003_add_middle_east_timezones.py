# Data migration: ensure Middle East time zones exist with display names

from django.db import migrations

# Common Middle East IANA time zones with display names
MIDDLE_EAST_TIMEZONES = [
    ("Asia/Dubai", "Dubai (UAE)"),
    ("Asia/Riyadh", "Riyadh (Saudi Arabia)"),
    ("Asia/Kuwait", "Kuwait"),
    ("Asia/Bahrain", "Bahrain"),
    ("Asia/Qatar", "Qatar"),
    ("Asia/Muscat", "Muscat (Oman)"),
    ("Asia/Tehran", "Tehran (Iran)"),
    ("Asia/Jerusalem", "Jerusalem (Israel)"),
    ("Asia/Amman", "Amman (Jordan)"),
    ("Asia/Beirut", "Beirut (Lebanon)"),
    ("Asia/Damascus", "Damascus (Syria)"),
    ("Asia/Baghdad", "Baghdad (Iraq)"),
    ("Asia/Aden", "Aden (Yemen)"),
    ("Europe/Istanbul", "Istanbul (Turkey)"),
    ("Asia/Nicosia", "Nicosia (Cyprus)"),
    ("Africa/Cairo", "Cairo (Egypt)"),
]


def add_middle_east_timezones(apps, schema_editor):
    Timezone = apps.get_model("masters", "Timezone")
    # Use a high sort_order so these appear after the main seed; or use 0 to prioritize
    sort_order_start = 10000
    for idx, (code, name) in enumerate(MIDDLE_EAST_TIMEZONES):
        obj, created = Timezone.objects.get_or_create(
            code=code,
            defaults={
                "name": name,
                "is_active": True,
                "sort_order": sort_order_start + idx,
            },
        )
        if not created:
            obj.name = name
            obj.is_active = True
            obj.save(update_fields=["name", "is_active"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("masters", "0002_seed_currencies_and_timezones"),
    ]

    operations = [
        migrations.RunPython(add_middle_east_timezones, noop),
    ]
