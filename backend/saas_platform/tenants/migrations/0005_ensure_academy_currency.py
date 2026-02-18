from django.db import migrations


def ensure_currency_column(apps, schema_editor):
    connection = schema_editor.connection
    table_name = 'academies'
    column_name = 'currency'

    with connection.cursor() as cursor:
        if connection.vendor == 'postgresql':
            cursor.execute(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_name = %s AND column_name = %s",
                [table_name, column_name]
            )
            exists = cursor.fetchone() is not None
        elif connection.vendor == 'sqlite':
            cursor.execute(f"PRAGMA table_info({table_name})")
            exists = any(row[1] == column_name for row in cursor.fetchall())
        else:
            cursor.execute(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_name = %s AND column_name = %s",
                [table_name, column_name]
            )
            exists = cursor.fetchone() is not None

        if exists:
            return

        cursor.execute(
            f"ALTER TABLE {table_name} "
            "ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD'"
        )


def noop_reverse(apps, schema_editor):
    return


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0004_academy_schema_name'),
    ]

    operations = [
        migrations.RunPython(ensure_currency_column, noop_reverse),
    ]
