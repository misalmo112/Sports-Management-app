# Generated migration for MediaFile model

import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('tenants', '__first__'),
    ]

    operations = [
        migrations.CreateModel(
            name='MediaFile',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('file_name', models.CharField(db_index=True, max_length=255)),
                ('file_path', models.CharField(max_length=1024)),
                ('file_size', models.BigIntegerField(db_index=True)),
                ('mime_type', models.CharField(blank=True, max_length=100)),
                ('description', models.TextField(blank=True)),
                ('is_active', models.BooleanField(db_index=True, default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('academy', models.ForeignKey(db_index=True, on_delete=django.db.models.deletion.CASCADE, related_name='media_files', to='tenants.academy')),
            ],
            options={
                'verbose_name': 'Media File',
                'verbose_name_plural': 'Media Files',
                'db_table': 'tenant_media_files',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='mediafile',
            index=models.Index(fields=['academy', 'is_active'], name='tenant_medi_academy_idx'),
        ),
        migrations.AddIndex(
            model_name='mediafile',
            index=models.Index(fields=['academy', 'created_at'], name='tenant_medi_academy_created_idx'),
        ),
        migrations.AddIndex(
            model_name='mediafile',
            index=models.Index(fields=['file_name'], name='tenant_medi_file_nam_idx'),
        ),
    ]
