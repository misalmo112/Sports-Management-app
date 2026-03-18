# Generated for safe academy delete: allow academy delete while keeping payment records

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('subscriptions', '0003_add_subscription_suspended_at'),
    ]

    operations = [
        migrations.AlterField(
            model_name='platformpayment',
            name='academy',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='platform_payments',
                to='tenants.academy',
            ),
        ),
    ]
