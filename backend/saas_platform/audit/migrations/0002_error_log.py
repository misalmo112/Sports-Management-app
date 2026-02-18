from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0001_initial'),
        ('audit', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ErrorLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('request_id', models.CharField(blank=True, db_index=True, max_length=64)),
                ('path', models.CharField(blank=True, max_length=255)),
                ('method', models.CharField(blank=True, max_length=10)),
                ('status_code', models.PositiveIntegerField(db_index=True)),
                ('code', models.CharField(db_index=True, max_length=50)),
                ('message', models.TextField(blank=True)),
                ('stacktrace', models.TextField(blank=True, null=True)),
                ('role', models.CharField(blank=True, max_length=20)),
                ('service', models.CharField(db_index=True, default='backend', max_length=50)),
                ('environment', models.CharField(db_index=True, default='local', max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('academy', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='error_logs', to='tenants.academy')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='error_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Error Log',
                'verbose_name_plural': 'Error Logs',
                'db_table': 'error_logs',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='errorlog',
            index=models.Index(fields=['created_at'], name='error_logs_created__2e0c0b_idx'),
        ),
        migrations.AddIndex(
            model_name='errorlog',
            index=models.Index(fields=['status_code', 'created_at'], name='error_logs_status__d2d2b1_idx'),
        ),
        migrations.AddIndex(
            model_name='errorlog',
            index=models.Index(fields=['code', 'created_at'], name='error_logs_code_cr_3a0e97_idx'),
        ),
        migrations.AddIndex(
            model_name='errorlog',
            index=models.Index(fields=['academy', 'created_at'], name='error_logs_academ_8c8f78_idx'),
        ),
        migrations.AddIndex(
            model_name='errorlog',
            index=models.Index(fields=['user', 'created_at'], name='error_logs_user_cr_57c5c6_idx'),
        ),
    ]
