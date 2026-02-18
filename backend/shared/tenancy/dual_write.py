"""Helpers for dual-write to public schema during migration."""

import os
import logging
from django.db import connection
from shared.tenancy.context import get_current_schema, is_dual_write_disabled
from shared.tenancy.schema import is_valid_schema_name

logger = logging.getLogger(__name__)


def _dual_write_enabled():
    return os.getenv('TENANT_DUAL_WRITE', 'false').lower() == 'true'

def _dual_write_dry_run():
    return os.getenv('TENANT_DUAL_WRITE_DRY_RUN', 'false').lower() == 'true'


def _can_dual_write(model):
    if connection.vendor != 'postgresql':
        return False
    if not _dual_write_enabled():
        return False
    if is_dual_write_disabled():
        return False
    schema_name = get_current_schema()
    if not schema_name or not is_valid_schema_name(schema_name):
        return False
    if not model._meta.managed:
        return False
    return model._meta.db_table.startswith('tenant_')


def upsert_to_public(instance):
    model = instance.__class__
    if not _can_dual_write(model):
        return
    pk_value = instance.pk
    if pk_value is None:
        return
    if _dual_write_dry_run():
        logger.info(
            "Dual-write dry run upsert",
            extra={'table': model._meta.db_table, 'pk': pk_value}
        )
        return

    fields = list(model._meta.fields)
    columns = [field.column for field in fields]
    values = [getattr(instance, field.attname) for field in fields]

    pk_column = model._meta.pk.column
    set_columns = [col for col in columns if col != pk_column]

    if set_columns:
        assignments = ", ".join([f"{col} = EXCLUDED.{col}" for col in set_columns])
    else:
        assignments = f"{pk_column} = EXCLUDED.{pk_column}"

    placeholders = ", ".join(["%s"] * len(columns))
    col_list = ", ".join(columns)
    sql = (
        f"INSERT INTO public.{model._meta.db_table} ({col_list}) "
        f"VALUES ({placeholders}) "
        f"ON CONFLICT ({pk_column}) DO UPDATE SET {assignments}"
    )

    with connection.cursor() as cursor:
        cursor.execute(sql, values)


def delete_from_public(instance):
    model = instance.__class__
    if not _can_dual_write(model):
        return
    pk_value = instance.pk
    if pk_value is None:
        return
    if _dual_write_dry_run():
        logger.info(
            "Dual-write dry run delete",
            extra={'table': model._meta.db_table, 'pk': pk_value}
        )
        return

    pk_column = model._meta.pk.column
    sql = f"DELETE FROM public.{model._meta.db_table} WHERE {pk_column} = %s"

    with connection.cursor() as cursor:
        cursor.execute(sql, [pk_value])
