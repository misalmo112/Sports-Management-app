from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_make_academy_nullable_for_superusers'),
    ]

    operations = [
        migrations.AddField(
            model_name='invitetoken',
            name='token_plain',
            field=models.CharField(
                blank=True,
                help_text='Plain invite token for admin display',
                max_length=255,
                null=True
            ),
        ),
    ]
