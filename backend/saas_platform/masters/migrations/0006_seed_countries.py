from django.db import migrations


COUNTRIES = [
    # Code, Name, Phone code, Region (basic curated subset; can be extended)
    ("ARE", "United Arab Emirates", "+971", "Middle East"),
    ("SAU", "Saudi Arabia", "+966", "Middle East"),
    ("QAT", "Qatar", "+974", "Middle East"),
    ("BHR", "Bahrain", "+973", "Middle East"),
    ("KWT", "Kuwait", "+965", "Middle East"),
    ("OMN", "Oman", "+968", "Middle East"),
    ("USA", "United States of America", "+1", "North America"),
    ("CAN", "Canada", "+1", "North America"),
    ("GBR", "United Kingdom", "+44", "Europe"),
    ("AUS", "Australia", "+61", "Oceania"),
    ("IND", "India", "+91", "Asia"),
    ("PAK", "Pakistan", "+92", "Asia"),
    ("ZAF", "South Africa", "+27", "Africa"),
]


def seed_countries(apps, schema_editor):
    Country = apps.get_model("masters", "Country")

    for sort_order, (code, name, phone_code, region) in enumerate(COUNTRIES, start=1):
        Country.objects.update_or_create(
            code=code,
            defaults={
                "name": name,
                "phone_code": phone_code,
                "region": region,
                "is_active": True,
                "sort_order": sort_order,
            },
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("masters", "0005_country"),
    ]

    operations = [
        migrations.RunPython(seed_countries, noop),
    ]

