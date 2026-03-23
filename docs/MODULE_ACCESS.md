# Tenant module access (STAFF)

Module keys are the single source of truth for **delegated staff** (`User.role == STAFF`). They align with `NavigationItem.id` under `navigationConfig.ADMIN` in `frontend/src/shared/nav/navigation.ts`, plus `setup`.

## Semantics

- **`allowed_modules` is NULL**: full module bypass for **`ADMIN`** (legacy).
- **`OWNER`**: always bypasses module checks (same as before).
- **`STAFF`**: non-null, non-empty list of keys; `[]` is invalid on save. No `*` sentinel in v1.
- **My Account** APIs (`GET/PATCH /api/v1/tenant/account/`, `POST .../tenant/account/change-password/`): any authenticated user in the academy context (`IsAuthenticatedAcademyUser`), not gated by module keys.

## Shared endpoints

Some endpoints are used by both **tenant admins** and **parents/coaches**. Module enforcement applies only to the **admin** side of the composite permission (e.g. `IsTenantAdminOrParent`): `OWNER` / full `ADMIN` / `STAFF` with the listed module.

| Endpoint family | Composite | Admin module key |
|-----------------|-----------|------------------|
| Invoices (read shared with parent) | `IsTenantAdminOrParent` | `invoices` |
| Receipts (read shared with parent) | `IsTenantAdminOrParent` | `receipts` |
| Classes / enrollments | `IsTenantAdminOrCoach`, etc. | `classes` |
| Attendance | `IsTenantAdminOrCoach`, etc. | `attendance` |
| Media | `IsTenantAdminOrCoach`, etc. | `media` |

## Module key reference

| module_key | UI label (typical) | Frontend path prefix | Tenant Django app(s) | split |
|------------|-------------------|----------------------|----------------------|-------|
| admin-overview | Overview | `/dashboard/admin/overview` | `tenant.overview` | |
| setup | Setup / checklist | `/dashboard/setup` | `tenant.onboarding` | yes |
| students | Students | `/dashboard/students` | `tenant.students` | |
| classes | Classes | `/dashboard/classes` | `tenant.classes` | |
| attendance | Attendance | `/dashboard/attendance` | `tenant.attendance` | |
| finance-items | Items | `/dashboard/finance/items` | `tenant.billing` | |
| invoices | Invoices | `/dashboard/finance/invoices` | `tenant.billing` | yes |
| receipts | Receipts | `/dashboard/finance/receipts` | `tenant.billing` | yes |
| users | Users | `/dashboard/users` | `tenant.users` | |
| media | Media | `/dashboard/media` | `tenant.media` | yes |
| reports | Reports | `/dashboard/reports` | `tenant.reports` | |
| finance-overview | Finance overview | `/dashboard/management/finance` | `tenant.billing` | yes |
| facilities | Facilities | `/dashboard/management/facilities` | `tenant.facilities` | |
| staff | Staff (coaches) | `/dashboard/management/staff` | `tenant.coaches` | |
| feedback | Feedback | `/dashboard/feedback` | `tenant.communication` | |
| settings-home | Settings home | `/dashboard/settings` | `tenant.academy` | yes |
| organization-settings | Organization | `/dashboard/settings/organization` | `tenant.academy`, `tenant.onboarding` | yes |
| tax-settings | Tax | `/dashboard/settings/tax` | `tenant.academy` | |
| locations | Locations | `/dashboard/settings/locations` | `tenant.onboarding` | |
| academy-settings | Subscription | `/dashboard/settings/subscription` | `tenant.academy` | |
| usage-settings | Usage & limits | `/dashboard/settings/usage` | `tenant.academy` | |
| sports | Sports | `/dashboard/settings/sports` | `tenant.onboarding` | |
| terms | Terms | `/dashboard/settings/terms` | `tenant.onboarding` | |
| currencies | Currencies | `/dashboard/settings/currencies` | `tenant.masters` | |
| timezones | Time zones | `/dashboard/settings/timezones` | `tenant.masters` | |
| bulk-actions | Bulk actions | `/dashboard/settings/bulk-actions` | `tenant.bulk_imports` | |

**split**: one nav module maps to multiple tenant apps or shared parent/coach surfaces.

## Forbidden grants for STAFF

Keys in `FORBIDDEN_STAFF_MODULES` in `backend/shared/permissions/module_keys.py` cannot be assigned (validated on create/update): `users`, `academy-settings`, `bulk-actions`.

## Backend implementation

- Constants: `backend/shared/permissions/module_keys.py`
- Access checks: `backend/shared/permissions/tenant.py` (`IsTenantAdmin` + `required_tenant_module` on views)

See also [PERMISSIONS.md](./PERMISSIONS.md) and [HANDOFF_MODULE_BASED_STAFF.md](./HANDOFF_MODULE_BASED_STAFF.md) (implementation handoff and test commands).

## Last Owner / full Admin (Phase 6)

The API blocks **deactivating** (`PATCH` with `is_active: false`) or **soft-deleting** (`DELETE` on the user endpoint) the last **login-capable** Owner or full Admin in an academy.

- **Counted as elevated:** `role` is `OWNER` or `ADMIN`, and the user is **`is_active=True`** and **`is_verified=True`** (invited-but-not-verified admins do not count as a backup).
- **Break-glass:** Django **`is_superuser`** or tenant role **`SUPERADMIN`** may still remove the last elevated user (platform / support recovery).
- **Recovery if locked out:** use a platform superuser or direct database access; there is no self-service path once zero elevated admins remain.

## Audit: STAFF `allowed_modules` changes

When an **OWNER** or **ADMIN** updates a **STAFF** user’s `allowed_modules`, the backend writes a row via `saas_platform.audit.AuditService` with `resource_type=USER`, `user=None` (avoids cross-schema FK issues), `academy` set, and `changes_json` including `before`, `after`, `actor_email`, and `target_user_id`. Logs live in the **public** `audit_logs` table (support / platform visibility).

## Adding a new tenant module (checklist)

Keep nav ids, API enforcement, and STAFF grants aligned.

1. **Nav:** Add an item under `navigationConfig.ADMIN` in `frontend/src/shared/nav/navigation.ts` with a stable **`id`** (that string becomes the module key).
2. **Routes:** Register the route in `frontend/src/routes/index.tsx` and, for admin-only pages, pass the matching key into **`RequireModule`** (see `frontend/src/shared/components/common/RequireModule.tsx`).
3. **Backend registry:** Add the key to `TENANT_MODULE_KEYS` in `backend/shared/permissions/module_keys.py`. If STAFF must never receive it, add it to **`FORBIDDEN_STAFF_MODULES`**.
4. **DRF views:** Set `required_tenant_module = '<key>'` on the tenant admin view(s) (same pattern as other apps under `backend/tenant/`).
5. **STAFF picker / display:** If the module is grantable to STAFF, add it to `frontend/src/shared/constants/staffModulePickerGroups.ts` (and any presets) so invite/edit UX stays consistent.
6. **Tests:** Extend `backend/tests/tenant/test_staff_tenant_module_matrix.py` and/or add a focused view test so the new endpoint returns **403** for STAFF without the key.

## Frontend (Phase 5): nav filter, route guards, STAFF landing

Implementation: `frontend/src/shared/nav/navigation.ts` (`filterAdminNavByModules`, `getStaffLandingPathFromModules`, `getTenantDashboardHomePath`), `frontend/src/shared/components/common/RequireModule.tsx`, `ModuleAccessDeniedPage.tsx`, `DashboardHomeRedirect.tsx`, `frontend/src/routes/index.tsx`.

### Sidebar

- For **`STAFF`**, `getNavigationForRole` shows only nav items whose `id` is in `allowed_modules` (from `localStorage` key `user_allowed_modules`), plus **`my-account`** without requiring that key in the grant list.
- **`OWNER` / `ADMIN`**: full admin nav (unchanged).

### STAFF default landing

- **`getStaffLandingPathFromModules`** walks **`navigationConfig.ADMIN`** in sidebar order and returns the **first** item path where `id !== 'my-account'` and the id is granted. So if both **`admin-overview`** and **`setup`** are granted, landing is **overview** first.
- If nothing matches (empty or unknown keys only), fallback is **`/dashboard/settings/account`**.
- **`/dashboard`** (index) and **onboarding completion** (`OnboardingWizard`) use **`getTenantDashboardHomePath(role)`** so STAFF is not sent to **`/dashboard/setup`** unless `setup` is the first matching grant (or they lack `admin-overview` but have `setup`).

### Deep links and forbidden UX

- Routes under **`/dashboard/*`** that serve **ADMIN / OWNER / STAFF** and pass a fourth argument to `createProtectedRoute` are wrapped with **`RequireModule`** using that module key. If **STAFF** lacks the key, they are redirected to **`/dashboard/access-denied`** with **`state: { moduleKey }`** (friendly copy + “Go to home” / “My account”).
- **`RequireModule` does not apply** to **`/dashboard/settings/account`**, **`/dashboard/access-denied`**, or **`/dashboard`** (index redirect). Platform, owner, coach, and parent routes are unchanged (role-only guards).

### Tenant admin routes → `requiredModule` (SPA)

| Path pattern (under `/dashboard/`) | `requiredModule` |
|-----------------------------------|------------------|
| `admin/overview` | `admin-overview` |
| `setup` | `setup` |
| `students`, `students/new`, `students/:id`, `students/:id/edit` | `students` |
| `classes`, `classes/new`, `classes/:id`, `classes/:id/edit`, `classes/:id/enrollments` | `classes` |
| `attendance`, `attendance/mark`, `attendance/coach`, `attendance/coach/mark` | `attendance` |
| `finance/items` | `finance-items` |
| `finance/invoices`, `finance/invoices/new`, `finance/invoices/:id` | `invoices` |
| `finance/receipts`, `finance/receipts/new` | `receipts` |
| `settings` | `settings-home` |
| `settings/organization`, `settings/academy` | `organization-settings` |
| `settings/tax` | `tax-settings` |
| `settings/subscription` | `academy-settings` |
| `settings/usage` | `usage-settings` |
| `settings/locations` | `locations` |
| `settings/sports` | `sports` |
| `settings/terms` | `terms` |
| `settings/currencies` | `currencies` |
| `settings/timezones` | `timezones` |
| `settings/bulk-actions` | `bulk-actions` |
| `media` | `media` |
| `reports` | `reports` |
| `management/finance` | `finance-overview` |
| `management/facilities` | `facilities` |
| `management/staff`, `management/staff/:id` | `staff` |
| `feedback` | `feedback` |
| `users`, `users/:id` | `users` |

**No `requiredModule` (tenant admin shell):** `settings/account`, `access-denied`, index redirect.

**Tests:** `frontend/src/shared/nav/__tests__/navigationStaffModules.test.ts`.
