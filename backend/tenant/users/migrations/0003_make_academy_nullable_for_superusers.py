# Generated migration to make academy nullable for superusers

from django.db import migrations, models
import django.db.models.deletion


def set_superuser_academy_null(apps, schema_editor):
    """Set academy to None for existing superusers."""
    User = apps.get_model('users', 'User')
    User.objects.filter(is_superuser=True).update(academy=None)


def reverse_set_superuser_academy(apps, schema_editor):
    """Reverse migration - would need to assign academies (not implemented)."""
    # This is a data migration that sets academy to None for superusers
    # Reversing would require assigning academies to superusers, which we don't do
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_coachprofile_location'),
        ('tenants', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='academy',
            field=models.ForeignKey(
                blank=True,
                help_text='Academy this user belongs to (null for platform superusers)',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='users',
                to='tenants.academy',
                db_index=True
            ),
        ),
        migrations.RunPython(set_superuser_academy_null, reverse_set_superuser_academy),
    ]
