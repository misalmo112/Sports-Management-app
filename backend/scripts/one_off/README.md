## One-off scripts

This folder contains scripts that were used to repair existing environments.

- These are **not** part of normal application startup.
- Assume **production data**: take a DB backup/snapshot before running anything here.
- Prefer the normal migration flow (`python manage.py migrate`, then `python manage.py tenant_setup_all`) once tenant migration history is healthy.

### Tenant migration history repair

Script: `backend/scripts/one_off/tenant_migrations/repair_tenants_0005_history.py`

Purpose: Fix `InconsistentMigrationHistory` where `tenant` app migrations (e.g. `facilities.0001_initial`) were recorded as applied before their dependency `tenants.0005_ensure_academy_currency` in tenant schemas.

How to run (Docker):

```bash
docker compose up -d --build
docker compose exec backend python backend/scripts/one_off/tenant_migrations/repair_tenants_0005_history.py
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py tenant_setup_all
```

### Historical password reset workaround

Script: `backend/scripts/one_off/tenant_migrations/create_password_reset_table_tenant.py`

Purpose: Previously used to create `tenant_password_reset_tokens` and mark `users.0005_password_reset_token` as applied while tenant migration history was broken.

Do **not** run this if you can run `tenant_setup_all` successfully.

