from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("tenants", "0005_ensure_academy_currency"),
    ]

    operations = [
        migrations.AddField(
            model_name="onboardingstate",
            name="step_1_completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="onboardingstate",
            name="step_2_completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="onboardingstate",
            name="step_3_completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="onboardingstate",
            name="step_4_completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="onboardingstate",
            name="step_5_completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="onboardingstate",
            name="step_6_completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

