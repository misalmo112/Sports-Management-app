"""Schema naming utilities for schema-based tenancy."""

from contextlib import contextmanager
from django.db import connection
from shared.tenancy.context import set_current_schema, clear_tenancy_context


def build_schema_name(academy_id):
    if hasattr(academy_id, 'hex'):
        suffix = academy_id.hex
    else:
        suffix = str(academy_id).replace('-', '')
    return f"tenant_{suffix}"[:63]


def is_valid_schema_name(schema_name):
    if not schema_name:
        return False
    if len(schema_name) > 63:
        return False
    if not schema_name.startswith('tenant_'):
        return False
    return schema_name.replace('_', '').isalnum()


@contextmanager
def schema_context(schema_name):
    if connection.vendor != 'postgresql' or not is_valid_schema_name(schema_name):
        yield False
        return

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT 1 FROM information_schema.schemata WHERE schema_name = %s",
            [schema_name],
        )
        if cursor.fetchone() is None:
            yield False
            return

    with connection.cursor() as cursor:
        cursor.execute(
            f'SET search_path TO {connection.ops.quote_name(schema_name)}, public'
        )
    set_current_schema(schema_name)
    try:
        yield True
    finally:
        with connection.cursor() as cursor:
            cursor.execute('SET search_path TO public')
        clear_tenancy_context()
