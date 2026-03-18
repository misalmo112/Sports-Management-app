from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("masters", "0004_exchange_rate"),
    ]

    operations = [
        migrations.CreateModel(
            name="Country",
            fields=[
                ("id", models.AutoField(primary_key=True, serialize=False)),
                ("code", models.CharField(db_index=True, max_length=3, unique=True)),
                ("name", models.CharField(max_length=100)),
                ("phone_code", models.CharField(blank=True, max_length=10)),
                ("region", models.CharField(blank=True, max_length=50)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("sort_order", models.PositiveIntegerField(blank=True, default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "platform_countries",
                "ordering": ["sort_order", "name"],
                "verbose_name": "Country",
                "verbose_name_plural": "Countries",
            },
        ),
    ]

