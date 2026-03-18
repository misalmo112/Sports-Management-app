from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("onboarding", "0002_onboarding_checklist_state"),
    ]

    operations = [
        migrations.AddField(
            model_name="onboardingcheckliststate",
            name="members_imported_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="onboardingcheckliststate",
            name="staff_invited_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="onboardingcheckliststate",
            name="first_program_created_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="onboardingcheckliststate",
            name="age_categories_configured_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="onboardingcheckliststate",
            name="attendance_defaults_configured_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

