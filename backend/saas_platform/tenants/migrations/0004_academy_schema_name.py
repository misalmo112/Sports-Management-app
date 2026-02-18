from django.db import migrations, models


def set_schema_name(apps, schema_editor):
    Academy = apps.get_model('tenants', 'Academy')
    for academy in Academy.objects.all():
        if not academy.schema_name:
            suffix = academy.id.hex if hasattr(academy.id, 'hex') else str(academy.id).replace('-', '')
            schema_name = f"tenant_{suffix}"[:63]
            Academy.objects.filter(pk=academy.pk).update(schema_name=schema_name)


def unset_schema_name(apps, schema_editor):
    Academy = apps.get_model('tenants', 'Academy')
    Academy.objects.update(schema_name=None)


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0003_academy_currency'),
    ]

    operations = [
        migrations.AddField(
            model_name='academy',
            name='schema_name',
            field=models.CharField(
                max_length=63,
                unique=True,
                null=True,
                blank=True,
                db_index=True
            ),
        ),
        migrations.RunPython(set_schema_name, unset_schema_name),
    ]
