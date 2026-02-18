# Multi-Tenant Schema Migration Plan

## Goal
Move from shared tables (single schema) to one schema per academy in Postgres, plus a shared "public" schema for platform-wide data. This enables accurate per-academy DB sizing, stronger isolation, and simpler per-tenant backup/restore.

## Current Assumptions
- Single Postgres database.
- Tenant scoping is done by `academy_id` on most tenant tables.
- Superadmin/platform tables (plans, subscriptions, audit, etc.) are global.
- Django + DRF backend.

Adjust as needed if any of these are not true.

## Target Architecture
- **Public schema**: platform/global tables (users, plans, audit, error logs, subscriptions, tenants list).
- **Tenant schemas**: one schema per academy (e.g., `tenant_<academy_uuid_hex>`).
- **Routing**: request middleware resolves academy and switches schema for ORM queries.

## Current Table Inventory (from codebase)
### Tables with academy foreign key (candidates for tenant schema)
- `tenant_parents` (tenant.students.Parent)
- `tenant_students` (tenant.students.Student)
- `tenant_coaches` (tenant.coaches.Coach)
- `tenant_classes` (tenant.classes.Class)
- `tenant_enrollments` (tenant.classes.Enrollment)
- `tenant_attendance` (tenant.attendance.Attendance)
- `tenant_coach_attendance` (tenant.attendance.CoachAttendance)
- `tenant_media_files` (tenant.media.MediaFile)
- `tenant_billing_items` (tenant.billing.Item)
- `tenant_invoices` (tenant.billing.Invoice)
- `tenant_invoice_items` (tenant.billing.InvoiceItem)
- `tenant_receipts` (tenant.billing.Receipt)
- `tenant_users` (tenant.users.User)
- `tenant_admin_profiles` (tenant.users.AdminProfile)
- `tenant_coach_profiles` (tenant.users.CoachProfile)
- `tenant_parent_profiles` (tenant.users.ParentProfile)
- `tenant_invite_tokens` (tenant.users.InviteToken)
- `tenant_complaints` (tenant.communication.Feedback)
- `tenant_locations` (tenant.onboarding.Location)
- `tenant_sports` (tenant.onboarding.Sport)
- `tenant_age_categories` (tenant.onboarding.AgeCategory)
- `tenant_terms` (tenant.onboarding.Term)
- `tenant_pricing_items` (tenant.onboarding.PricingItem)
- `tenant_quotas` (saas_platform.quotas.TenantQuota)
- `tenant_usages` (saas_platform.quotas.TenantUsage)
- `subscriptions` (saas_platform.subscriptions.Subscription) - academy scoped but platform-managed
- `audit_logs` (saas_platform.audit.AuditLog) - academy scoped but platform-managed
- `error_logs` (saas_platform.audit.ErrorLog) - academy scoped but platform-managed
- `onboarding_states` (saas_platform.tenants.OnboardingState) - academy scoped

### Public/global tables (no academy foreign key)
- `academies` (saas_platform.tenants.Academy)
- `plans` (saas_platform.subscriptions.Plan)

## Current API Endpoints (from backend/config/urls.py)
### Platform API (`/api/v1/platform/`)
- `academies/` (CRUD, plus `/{id}/plan`, `/{id}/quota`, `/{id}/invite-link`)
- `plans/` (CRUD)
- `stats/`
- `errors/`
- `audit-logs/` (read-only)
- `error-logs/` (read-only)

### Tenant API (`/api/v1/tenant/`)
- `onboarding/state/`
- `onboarding/step/<int:step>/`
- `onboarding/complete/`
- `locations/`
- `sports/`
- `age-categories/`
- `terms/`
- `overview/`
- `reports/`
- `feedback/`
- `students/`
- `parents/`
- `coaches/`
- `classes/`
- `enrollments/`
- `attendance/`
- `coach-attendance/`
- `items/`
- `invoices/`
- `receipts/`
- `media/`
- `masters/timezones/`
- `masters/currencies/`
- `academy/`
- `users/`

### Auth API (`/api/v1/auth/`)
- `token/`
- `invite/validate/`
- `invite/accept/`

### Legacy admin API (`/api/v1/admin/`)
- `users/` (same routes as tenant users)

## Phase 0: Inventory and Design
1) **List academy-scoped tables**
   - All tables with a FK to `Academy` (`academy_id`).
   - Include media, attendance, classes, students, parents, etc.

2) **List global tables**
   - Superadmin/platform tables: plans, subscriptions, audit logs, error logs, academy registry.
   - Anything that must remain shared.

3) **Identify cross-tenant queries**
   - Reports or admin views that aggregate across academies.
   - Decide if those should read from public schema or a separate analytics pipeline.

4) **Define schema naming**
   - `tenant_<academy_uuid>` recommended for uniqueness and safety.
   - Keep a `tenants` registry table in public schema with schema_name.

## Phase 1: Infrastructure Preparation
1) **Schema creation helper**
   - Create a management command: `create_tenant_schema(academy_id)`.
   - Creates schema and runs tenant migrations.

2) **Django configuration**
   - Use a schema-aware library (e.g., `django-tenants` or a minimal custom router).
   - Add middleware to resolve academy from:
     - Host/subdomain, or
     - `x-academy-id` header, or
     - Logged-in user's academy.

3) **Tenant registry**
   - Add schema_name to Academy or a separate TenantRegistry model.
   - Ensure every academy has a schema name stored.

## Phase 2: Data Model Split
1) **Separate apps**
   - Identify which apps are public vs tenant.
   - Public: `saas_platform.*`
   - Tenant: `tenant.*`

2) **Migrations**
   - Ensure tenant apps can run against a non-public schema.
   - Ensure public apps remain in `public`.

3) **Cross-schema foreign keys**
   - Avoid foreign keys from tenant schema to public schema.
   - Use IDs or denormalized fields instead.

## Phase 3: Backfill (Initial Migration)
1) **Schema creation**
   - For each academy:
     - Create schema.
     - Run tenant migrations in that schema.

2) **Data copy**
   - For each academy:
     - Copy data from shared tables into tenant schema.
     - Use `academy_id` filter for each table.
   - Run in dependency order (parents before children).

3) **Validation**
   - Row counts match between shared tables and tenant schema per academy.
   - Key relationships intact.

## Phase 4: Dual-Write and Read Switch
1) **Dual-write (temporary)**
   - For writes to tenant tables, write to:
     - Old shared tables, and
     - New tenant schema tables.
   - Wrap in a single request scope and log failures.

2) **Read switch**
   - Switch reads to tenant schema.
   - Keep dual-write for a short period to confirm stability.

3) **Monitoring**
   - Compare counts and checksums across old/new data.
   - Watch error logs and performance.

## Phase 5: Cutover
1) **Stop dual-write**
   - Write only to tenant schemas.

2) **Freeze old tables**
   - Make shared tenant tables read-only or remove access.

3) **Cleanup**
   - Optionally archive or drop old tenant tables after a defined retention period.

## Rollback Plan
- Toggle reads back to old tables.
- Keep dual-write during rollback window if possible.
- Have a per-academy restore plan.

## Exact DB Sizing After Migration
Once each academy is in its own schema:
- Use Postgres size functions:
  - Per schema total: sum `pg_total_relation_size` over all tables in schema.
  - Per table exact size: `pg_total_relation_size('schema.table')`.
- Expose these values in analytics and academy detail pages.

## Operational Considerations
- **Backups**: per-schema or per-tenant backups.
- **Migrations**: run tenant migrations across all schemas (batch or rolling).
- **Performance**: ensure connection pooling supports schema switching.
- **Security**: ensure schema switching cannot be spoofed (validate academy access).

## Suggested Sequencing
1) Implement schema switching + registry.
2) Add schema creation command and tenant migrations.
3) Backfill data for a staging environment.
4) Enable dual-write and switch reads in staging.
5) Validate and repeat in production with controlled rollout.

## Risks and Mitigations
- **Cross-tenant queries break**: move these to public analytics.
- **Long backfill time**: do per academy in batches.
- **Data drift**: dual-write and verification jobs during rollout.
- **Complex migrations**: use a schema-aware migration runner.

## Concrete Checklist and Commands (local and docker)
### Prereqs
- Postgres must be running and reachable (LOCAL or Docker).
- `.env` configured (DATABASE_URL points to Postgres).

### Step A: Prepare schema tooling
1) Install deps (local)
   - `pip install -r backend/requirements.txt`
2) Run migrations (public schema)
   - `python backend/manage.py migrate`
3) Add management commands (to implement)
   - `create_tenant_schema`
   - `tenant_migrate`
   - `tenant_backfill`
   - `tenant_verify`

### Step B: Create tenant schemas
For each academy:
1) Get academy IDs
   - `python backend/manage.py shell -c "from saas_platform.tenants.models import Academy; print([str(a.id) for a in Academy.objects.all()])"`
2) Create schema and run tenant migrations
   - `python backend/manage.py create_tenant_schema --academy <ACADEMY_UUID> --schema tenant_<ACADEMY_UUID>`
   - `python backend/manage.py tenant_migrate --schema tenant_<ACADEMY_UUID>`
3) Or run in one step for all academies
   - `python backend/manage.py tenant_setup_all`
   - Resume only (skip existing schemas): `python backend/manage.py tenant_setup_all --resume`

### Step C: Backfill tenant data
For each academy:
1) Run backfill
   - `python backend/manage.py tenant_backfill --academy <ACADEMY_UUID> --schema tenant_<ACADEMY_UUID>`
2) Verify counts
   - `python backend/manage.py tenant_verify --academy <ACADEMY_UUID> --schema tenant_<ACADEMY_UUID>`
   - Optional CSV report: `python backend/manage.py tenant_verify --academy <ACADEMY_UUID> --output tenant_verify.csv`
3) Or run full pipeline for a single academy
   - `python backend/manage.py tenant_setup_all --academy <ACADEMY_UUID>`

### Step D: Dual-write window
1) Enable dual-write flag (example env flag)
   - `TENANT_DUAL_WRITE=true`
   - Note: dual-write only runs when `TENANT_SCHEMA_ROUTING=true` and Postgres is used.
   - Optional: `TENANT_DUAL_WRITE_DRY_RUN=true` to log without writing.
   - Optional request header: `X-Dual-Write-Disabled: true` to skip for bulk ops.
2) Deploy backend
3) Monitor error logs and compare counts

### Step E: Cutover
1) Switch reads to tenant schema
   - `TENANT_SCHEMA_ROUTING=true`
2) Disable dual-write
   - `TENANT_DUAL_WRITE=false`

### Step F: Cleanup
1) Freeze old shared tenant tables (read-only)
2) Archive or drop after retention window

### Post-cutover sequence sync
- Public: `python backend/manage.py tenant_sync_sequences --schema public`
- Tenant schema: `python backend/manage.py tenant_sync_sequences --academy <ACADEMY_UUID>`

### Docker equivalents
- `docker compose exec backend python manage.py migrate`
- `docker compose exec backend python manage.py create_tenant_schema --academy <ACADEMY_UUID> --schema tenant_<ACADEMY_UUID>`
- `docker compose exec backend python manage.py tenant_migrate --schema tenant_<ACADEMY_UUID>`
- `docker compose exec backend python manage.py tenant_backfill --academy <ACADEMY_UUID> --schema tenant_<ACADEMY_UUID>`
- `docker compose exec backend python manage.py tenant_verify --academy <ACADEMY_UUID> --schema tenant_<ACADEMY_UUID>`
