"""
Historical one-off (do not run unless instructed):
Create tenant_password_reset_tokens and insert users.0005_password_reset_token
into each tenant schema's django_migrations.

This existed as a workaround while tenant migration history was inconsistent.
Prefer fixing tenant migration history and then running tenant_migrate/tenant_setup_all.
"""

import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.db import connection
from django.utils import timezone

from saas_platform.tenants.models import Academy

# SQL to create the table (matches 0005_password_reset_token migration)
CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS tenant_password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS tenant_pass_token_h_2c4e56_idx ON tenant_password_reset_tokens (token_hash);
CREATE INDEX IF NOT EXISTS tenant_pass_user_id_cf7124_idx ON tenant_password_reset_tokens (user_id, used_at);
CREATE INDEX IF NOT EXISTS tenant_pass_expires_164174_idx ON tenant_password_reset_tokens (expires_at, used_at);
"""

INSERT_MIGRATION_SQL = """
INSERT INTO django_migrations (app, name, applied)
SELECT 'users', '0005_password_reset_token', %s
WHERE NOT EXISTS (
    SELECT 1 FROM django_migrations
    WHERE app = 'users' AND name = '0005_password_reset_token'
);
"""

for academy in Academy.objects.filter(schema_name__isnull=False).exclude(schema_name=""):
    schema = academy.schema_name
    with connection.cursor() as c:
        c.execute("SET search_path TO %s, public", [schema])
        for stmt in CREATE_TABLE_SQL.strip().split(";"):
            stmt = stmt.strip()
            if stmt:
                c.execute(stmt)
        c.execute(INSERT_MIGRATION_SQL, [timezone.now()])
    print("Created table and migration record for schema:", schema)

with connection.cursor() as c:
    c.execute("SET search_path TO public")
print("Done.")

