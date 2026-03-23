# Permissions

## Overview

This document describes the current permission model used by the repository. It focuses on implemented permission classes, route guards, and academy-context rules rather than an aspirational all-features matrix.

## Active Access Surface

The current frontend route layer recognizes these roles:

- `SUPERADMIN`
- `OWNER`
- `ADMIN`
- `STAFF` (delegated dashboard access with `allowed_modules`)
- `COACH`
- `PARENT`

Important implementation note:

- the tenant `User` model uses `OWNER`, `ADMIN`, `STAFF`, `COACH`, and `PARENT`
- `STAFF`: non-empty `allowed_modules` (module keys aligned with admin nav ids); see [MODULE_ACCESS.md](./MODULE_ACCESS.md) and implementation handoff [HANDOFF_MODULE_BASED_STAFF.md](./HANDOFF_MODULE_BASED_STAFF.md)
- `ADMIN` with `allowed_modules` unset (`NULL`): full module bypass on tenant admin APIs
- `OWNER`: always bypasses module checks
- platform access also relies on `SUPERADMIN` role checks and `is_superuser` fallback logic
- `STUDENT` is not an active route or permission role in the current implementation

## Permission Classes

### Platform permissions

#### `shared.permissions.base.IsSuperadmin`

- grants access when the authenticated user has `role == 'SUPERADMIN'`
- falls back to `is_superuser` where needed

#### `shared.permissions.platform.IsPlatformAdmin`

- wraps `IsSuperadmin`
- is the standard guard for platform resources such as academies, plans, audit, analytics, and finance

### Tenant permissions

#### `shared.permissions.tenant.IsTenantAdmin`

- allows academy-scoped admin access for `OWNER`, `ADMIN`, and `STAFF`
- `OWNER` and `ADMIN` with `allowed_modules` NULL: full access to tenant admin endpoints
- `STAFF`: access only when the view declares `required_tenant_module` and the user’s `allowed_modules` contains that key
- also allows superadmin access through the shared superadmin check

#### `shared.permissions.tenant.IsAuthenticatedAcademyUser`

- any authenticated user whose `academy_id` matches `request.academy` (e.g. **My Account** / change password), without module checks

#### `shared.permissions.tenant.IsOwner`

- restricts access to `OWNER`

#### `shared.permissions.tenant.IsCoach`

- allows coach access and performs object checks against assigned classes or coach-linked objects

#### `shared.permissions.tenant.IsParent`

- allows parent access and performs object checks against parent-linked students or student-linked records

#### Composite tenant permissions

Implemented composite classes include:

- `IsParentOrCoach`
- `IsTenantAdminOrCoach`
- `IsTenantAdminOrParent`
- `IsTenantAdminOrParentOrCoach`

## Current Access Rules

### Platform APIs

Platform APIs under `/api/v1/platform/*` are SUPERADMIN-only unless a specific endpoint documents otherwise.

Current examples:

- academies
- plans
- platform analytics
- audit logs
- platform finance summary, payments, expenses, and export

The current finance endpoints all use `IsPlatformAdmin`.

### Tenant APIs

Tenant APIs under `/api/v1/tenant/*` require academy context unless the path is exempt.

Typical access shape:

- `OWNER` and `ADMIN`: tenant operational management
- `COACH`: assigned-class operations
- `PARENT`: own-children visibility and related records
- `SUPERADMIN`: may pass tenant permission checks through the shared superadmin path, while tenant-specific behavior is still enforced by queryset and object-level logic

### Frontend route guards

Dashboard routes are protected by:

- authentication guard
- role guard
- onboarding-complete guard where applicable

Current platform finance pages are guarded as `SUPERADMIN` only:

- `/dashboard/platform/finance`
- `/dashboard/platform/finance/payments`
- `/dashboard/platform/finance/expenses`

## Academy Context Resolution

Academy context is resolved by `shared.middleware.academy_context.AcademyContextMiddleware`.

Resolution order:

1. `X-Academy-ID` header
2. academy mapping from the authenticated user or token

Important current rules:

- platform and auth paths are exempt from academy resolution
- inactive academies are rejected
- superadmin can access any academy context
- non-superadmin tenant users are restricted to their own academy

## Current Role-to-Area Summary

This summary is intentionally high level and aligned to implemented route families.

| Area | SUPERADMIN | OWNER | ADMIN | STAFF | COACH | PARENT |
|---|---|---|---|---|---|---|
| Platform management | Yes | No | No | No | No | No |
| Platform finance | Yes | No | No | No | No | No |
| Tenant overview | Yes or routed equivalent | Yes | Yes | If module | Yes | Yes |
| Tenant operations | Read/admin bypass where allowed | Yes | Yes | If module | Limited | Limited |
| Tenant settings and user management | Read/admin bypass where allowed | Yes | Yes | If module (no users/subscription/bulk for STAFF) | No | No |

Notes:

- OWNER access is real in routing and tenant permission checks even though the tenant user enum is not yet a single clean source of truth for that role.
- This document should not be read as a guarantee that every resource supports every CRUD action for a role. Viewsets may tighten access further by action.

## Example Code Paths

Current implementation paths:

- `backend/shared/permissions/base.py`
- `backend/shared/permissions/platform.py`
- `backend/shared/permissions/tenant.py`
- `backend/shared/middleware/academy_context.py`
- `frontend/src/shared/utils/roleAccess.ts`
- `frontend/src/routes/index.tsx`

## Documentation Rules

- Keep this doc limited to current permission behavior.
- If a permission model is proposed but not implemented, document it in a plan doc instead.
- When role guards or academy-context rules change, update this doc and the route map in the same change.

## Related References

- `docs/MODULE_ACCESS.md`
- `docs/ROLE_ROUTE_MAP.md`
- `docs/ARCHITECTURE.md`
- `docs/API_CONVENTIONS.md`
- `docs/DOCUMENTATION_MAINTENANCE.md`
