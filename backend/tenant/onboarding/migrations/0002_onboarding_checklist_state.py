from django.db import migrations, models
import django.db.models.deletion


def drop_sequence_if_postgres(apps, schema_editor):
    """
    Best-effort cleanup for a previously-created sequence.

    SQLite (used in unit tests) doesn't support DROP SEQUENCE, so this must be a no-op there.
    """
    if schema_editor.connection.vendor != "postgresql":
        return

    with schema_editor.connection.cursor() as cursor:
        cursor.execute("DROP SEQUENCE IF EXISTS tenant_onboarding_checklist_state_id_seq;")

def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("onboarding", "0001_initial"),
    ]

    operations = [
        # Cleanup previously-created Postgres sequence (no-op on SQLite tests)
        migrations.RunPython(drop_sequence_if_postgres, noop_reverse),
        migrations.CreateModel(
            name="OnboardingChecklistState",
            fields=[
                ("id", models.AutoField(primary_key=True, serialize=False)),
                ("members_imported", models.BooleanField(default=False)),
                ("staff_invited", models.BooleanField(default=False)),
                ("first_program_created", models.BooleanField(default=False)),
                ("age_categories_configured", models.BooleanField(default=False)),
                ("attendance_defaults_configured", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "academy",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="onboarding_checklist_state",
                        to="tenants.academy",
                    ),
                ),
            ],
            options={
                "db_table": "tenant_onboarding_checklist_state",
                "verbose_name": "Onboarding Checklist State",
                "verbose_name_plural": "Onboarding Checklist States",
            },
        ),
        migrations.AddIndex(
            model_name="onboardingcheckliststate",
            index=models.Index(fields=["academy"], name="tenant_onbo_academy_8a4b4e_idx"),
        ),
    ]

