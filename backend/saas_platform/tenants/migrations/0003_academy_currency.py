from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tenants", "0002_onboardingstate_user_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="academy",
            name="currency",
            field=models.CharField(default="USD", max_length=3),
        ),
    ]
