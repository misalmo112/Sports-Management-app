# Generated migration for ExchangeRate model (Frankfurter sync)

from django.db import migrations, models
from django.utils import timezone


class Migration(migrations.Migration):

    dependencies = [
        ("masters", "0003_add_middle_east_timezones"),
    ]

    operations = [
        migrations.CreateModel(
            name="ExchangeRate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("base_currency", models.CharField(db_index=True, max_length=3)),
                ("currency", models.CharField(db_index=True, max_length=3)),
                ("rate", models.DecimalField(decimal_places=8, max_digits=20)),
                ("date", models.DateField(db_index=True)),
                ("fetched_at", models.DateTimeField(default=timezone.now)),
            ],
            options={
                "db_table": "platform_exchange_rates",
                "ordering": ["-date", "base_currency", "currency"],
                "verbose_name": "Exchange rate",
                "verbose_name_plural": "Exchange rates",
            },
        ),
        migrations.AddConstraint(
            model_name="exchangerate",
            constraint=models.UniqueConstraint(
                fields=("base_currency", "currency", "date"),
                name="platform_exchange_rates_unique_base_currency_date",
            ),
        ),
    ]
