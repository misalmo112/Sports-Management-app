# Data migration: seed Currency from constants, Timezone from zoneinfo/pytz

from django.db import migrations


def _get_timezone_codes():
    try:
        from zoneinfo import available_timezones
        return sorted(available_timezones())
    except ImportError:
        pass
    try:
        import pytz
        return list(pytz.all_timezones)
    except Exception:
        return ["UTC"]


def seed_currencies(apps, schema_editor):
    Currency = apps.get_model("masters", "Currency")
    from tenant.masters.constants import CURRENCIES

    for sort_order, code in enumerate(CURRENCIES, start=1):
        if not Currency.objects.filter(code=code).exists():
            Currency.objects.create(code=code, sort_order=sort_order, is_active=True)


def seed_timezones(apps, schema_editor):
    Timezone = apps.get_model("masters", "Timezone")
    codes = _get_timezone_codes()
    for sort_order, code in enumerate(codes, start=1):
        if len(code) <= 63 and not Timezone.objects.filter(code=code).exists():
            Timezone.objects.create(code=code, sort_order=sort_order, is_active=True)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("masters", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_currencies, noop),
        migrations.RunPython(seed_timezones, noop),
    ]
