# Generated manually for STAFF role and allowed_modules

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_password_reset_token'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='allowed_modules',
            field=models.JSONField(
                blank=True,
                default=None,
                help_text='For STAFF: non-empty list of module keys. NULL = full access for ADMIN only; OWNER always bypasses modules.',
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('OWNER', 'Owner'),
                    ('ADMIN', 'Admin'),
                    ('STAFF', 'Staff'),
                    ('COACH', 'Coach'),
                    ('PARENT', 'Parent'),
                ],
                db_index=True,
                help_text='User role within the academy',
                max_length=20,
            ),
        ),
    ]
