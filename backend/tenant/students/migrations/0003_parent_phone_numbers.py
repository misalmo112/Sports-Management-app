from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0002_student_emirates_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='parent',
            name='phone_numbers',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
