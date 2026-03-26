import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('audit', '0005_auditlog_scope_choices'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='errorlog',
            name='severity',
            field=models.CharField(
                choices=[
                    ('CRITICAL', 'Critical'),
                    ('HIGH', 'High'),
                    ('MEDIUM', 'Medium'),
                    ('LOW', 'Low'),
                ],
                db_index=True,
                default='LOW',
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='errorlog',
            name='is_resolved',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name='errorlog',
            name='resolved_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='resolved_errors',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='errorlog',
            name='resolved_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='errorlog',
            name='occurrence_count',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='errorlog',
            name='last_seen_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddIndex(
            model_name='errorlog',
            index=models.Index(
                fields=['severity', 'is_resolved', 'created_at'],
                name='error_logs_severity_resolved_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='errorlog',
            index=models.Index(
                fields=['path', 'code', 'created_at'],
                name='error_logs_path_code_created_idx',
            ),
        ),
    ]
