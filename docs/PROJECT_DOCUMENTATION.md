# Sports Academy Management System - Project Documentation

Version: 1.0
Last Updated: 2026-01-18

## 1. Scope and Goals

Goal: Build a multi-tenant SaaS platform that lets a Superadmin manage many academies while each academy operates in isolated tenant space for students, classes, attendance, and billing.

In scope:
- Multi-tenant backend with strict academy isolation.
- Role-based access control for Superadmin, Owner, Admin, Coach, Parent.
- Onboarding wizard that must be completed before tenant APIs are usable.
- Subscription plans, quota enforcement, and usage tracking.
- Media storage via S3-compatible storage (MinIO in dev).
- React frontend with role-based routing and shared UI foundation.

Out of scope (current phase):
- Mobile-first experience.
- External payment gateways (Stripe, etc.)
- Multi-academy billing orgs (optional, planned).

## 2. Core Principles

- Platform and tenant logic must never mix.
- Every tenant model must include academy FK and be filtered by request.academy.
- Onboarding is a hard gate: tenant APIs blocked until Academy.onboarding_completed is true.
- Quotas are hard blocks at 100 percent usage.
- No local file storage; always use S3 compatible storage.
- All configuration via environment variables.

## 3. Roles and Authority

Roles:
- SUPERADMIN: platform owner, global control.
- OWNER: owns one or more academies.
- ADMIN: manages a single academy.
- COACH: assigned classes only.
- PARENT: own children only.

Authority rules:
- Only SUPERADMIN can create academies.
- Role checks are mandatory at API level.
- UI restrictions are not sufficient.

## 4. Architecture Summary

Backend: Django + DRF, PostgreSQL, Redis, Celery
Frontend: React + Vite, TanStack Query, Tailwind
Storage: MinIO in dev (S3 compatible)

Ports (dev):
- Frontend: 5173
- Backend API: 8000
- Postgres: 5432
- Redis: 6379
- MinIO: 9000 (API), 9001 (console)

API base path: /api/v1/
- Platform APIs: /api/v1/platform/*
- Tenant APIs: /api/v1/tenant/*

## 5. Module Logic

### 5.1 Platform Layer (Global)

#### accounts
Purpose: Superadmin authentication and platform-level access.
Logic:
- Superadmin users authenticate via JWT.
- Only Superadmin can access platform endpoints.
Key constraints:
- Platform accounts are separate from tenant users.

#### tenants
Purpose: Academy (tenant) lifecycle management.
Logic:
- Academy is the root entity for all tenant data.
- Only Superadmin can create and manage academies.
- Academy has onboarding_completed flag.
Key constraints:
- One academy per tenant, unique slug.
- Onboarding controls tenant API access.

#### subscriptions
Purpose: Plans and subscription lifecycle.
Logic:
- Plan defines default quotas and pricing.
- Subscription links Academy to Plan with status and trial periods.
- Only one current subscription per academy.
- Overrides_json allows per-tenant quota overrides.
Key constraints:
- Exactly one is_current subscription per academy.
- Effective quotas = plan limits merged with overrides.

#### quotas
Purpose: Quota enforcement and usage tracking.
Logic:
- TenantUsage stores storage usage and cached counts.
- Quotas enforce hard blocks for students, coaches, admins, classes, storage.
- Storage updates are atomic with select_for_update.
Key constraints:
- No soft warnings beyond 100 percent usage.
- Quotas enforced at API layer, not UI.

#### audit
Purpose: Audit logging for platform operations.
Logic:
- Central AuditService records create, update, plan change, quota change actions.
- Used for compliance and troubleshooting.

#### analytics
Purpose: Platform-wide metrics.
Logic:
- Aggregates metrics across tenants (anonymized).
- Read-only for Superadmin.

### 5.2 Tenant Layer (Academy Scoped)

#### users
Purpose: Tenant user accounts and roles.
Logic:
- Users have academy context and role (OWNER, ADMIN, COACH, PARENT).
- Role enforcement is mandatory for all endpoints.

#### onboarding
Purpose: Mandatory setup before operations.
Logic:
- 6 sequential steps: profile, location, sports, age categories, terms, pricing.
- Steps are idempotent and upsert records.
- Locking prevents multiple admins from running wizard simultaneously.
- Completion sets Academy.onboarding_completed and OnboardingState.is_completed.

#### students
Purpose: Student lifecycle.
Logic:
- CRUD with academy FK.
- Parent links to students.
- Enrollment to classes is managed separately.
Constraints:
- Quota check on create.

#### coaches
Purpose: Coach profiles and assignments.
Logic:
- CRUD with academy FK.
- Coach assignment to classes is enforced.
Constraints:
- Quota check on create.

#### classes
Purpose: Scheduling and enrollments.
Logic:
- Class ties sport, coach, age category, term, and location.
- Supports capacity and enrollment management.
Constraints:
- Quota check on create.

#### attendance
Purpose: Attendance tracking.
Logic:
- Coach or Admin marks attendance per class and date.
- Attendance reports and filters per class/term.

#### billing
Purpose: Academy billing for parents.
Logic:
- Pricing items and durations define fees.
- Invoices include items, discounts, VAT, and partial payments.
- Receipts track payments and allocation to invoices.

#### media
Purpose: Media uploads and storage tracking.
Logic:
- Uploads go to S3-compatible storage.
- MediaFile records metadata and size.
- TenantUsage.storage_used_bytes updated atomically.
Constraints:
- Storage quota checked before upload.

#### reports
Purpose: Tenant reporting and exports.
Logic:
- Aggregated reports for attendance, financials, student progress.
- Export formats defined by report type.

### 5.3 Shared Layer

#### middleware
- Tenant resolution: sets request.academy from JWT.
- Onboarding gate: blocks tenant APIs until onboarding complete.
- Quota enforcement (via decorator or service).

#### permissions
- Platform permissions: IsPlatformAdmin.
- Tenant permissions: IsTenantAdmin, IsOwner, IsCoach, IsParent.
- Object-level access required for coach/parent scopes.

#### services
- Email service for notifications and invoices.
- Storage service for S3 integration.
- Quota service for usage checks and limits.

### 5.4 Frontend

Structure:
- features/ for platform and tenant modules.
- routes/ for role-based routing.
- layouts/ per role (platform, tenant, coach, parent).
- shared/ for UI components, API client, hooks, and utilities.

Logic:
- Auth state drives role-based routing.
- Tenant context is derived from JWT.
- Onboarding wizard is the first flow for new academies.
- API failures handled explicitly.

## 6. Cross-Module Workflows

### Academy Creation (Platform)
1. Superadmin creates Academy.
2. Subscription assigned to plan.
3. TenantUsage initialized.
4. Tenant onboarding starts.

### Onboarding Gate
1. Tenant user accesses onboarding endpoints only.
2. Steps 1-6 completed sequentially.
3. Academy.onboarding_completed set true.
4. Tenant APIs become available.

### Quota Enforcement
1. Create or upload request triggers quota check.
2. If limit exceeded, return 403 with quota details.
3. If allowed, operation proceeds and usage updates.

### Media Upload
1. Pre-check storage quota by total upload size.
2. Upload to S3-compatible storage.
3. Update TenantUsage.storage_used_bytes atomically.

## 7. Current Stage (Based on Repository State)

Completed:
- Platform backend implemented (tenants, subscriptions, quotas, audit, analytics) with services and serializers.
- Platform tests authored, but not runnable due to configuration issues.
- Tenant modules exist with models/serializers/views for core domains.
- Onboarding, quota, permissions, and API conventions documented.
- Frontend scaffold in place with features, layouts, routes, and shared UI foundation.
- Docker compose and environment contract defined.

Blocked / Needs Fixes:
- Tests not running due to platform module naming conflict and missing dependencies.
- Django INSTALLED_APPS config needs alignment for platform and shared modules.
- User model role field must be confirmed or permissions updated to match.

Not Verified Yet:
- Tenant module completeness against full feature list.
- End-to-end onboarding and quota flows in a running environment.
- Frontend flows for all roles.

## 8. Open Decisions to Confirm

- Final user model shape and role storage.
- Which billing flows are in MVP (invoices only vs receipts and partial payments).
- Parent portal scope for MVP.
- Multi-academy billing orgs (CustomerOrg) timeline.

## 9. References

- docs/ARCHITECTURE.md
- docs/MODELS.md
- docs/API_CONVENTIONS.md
- docs/PERMISSIONS.md
- docs/ENV_CONTRACT.md
- docs/ONBOARDING_CONTRACT.md
- docs/QUOTAS.md
- backend/IMPLEMENTATION_SUMMARY.md
- backend/tests/TEST_IMPLEMENTATION_STATUS.md