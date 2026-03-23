# HANDOFF FROM PHASES 1–5 → 6

**Epic:** Module-based staff access (`STAFF` + `allowed_modules`).

- **Canonical catalog & route mapping:** [MODULE_ACCESS.md](./MODULE_ACCESS.md)
- **Implementation inventory & API matrix:** [HANDOFF_MODULE_BASED_STAFF.md](./HANDOFF_MODULE_BASED_STAFF.md)
- **Granular handoffs:** [HANDOFF_PHASE_3_TO_4.md](./HANDOFF_PHASE_3_TO_4.md), [HANDOFF_PHASE_4_TO_5.md](./HANDOFF_PHASE_4_TO_5.md)

This document is the **single consolidated handoff** from completed work (Phases **0–5**) into **Phase 6**.

---

## Completed

### Phase 0 — Decisions & specification

- Module **key catalog**, **forbidden STAFF keys** (`users`, `academy-settings`, `bulk-actions`), **nav `id` ↔ module key** rule, **admin path strategy** for STAFF, defaults for migrated users and full ADMIN.
- Written in [MODULE_ACCESS.md](./MODULE_ACCESS.md) and related docs; no code deliverable.

### Phase 1 — Data model & identity API

- **`User.allowed_modules`** (`JSONField`, nullable); migration **0006** (`role` STAFF + `allowed_modules`).
- **Validation:** known keys only; STAFF requires non-empty list; forbidden keys rejected (**400**).
- **Semantics:** `NULL` on **ADMIN** = full bypass; **OWNER** always bypasses in permission code.
- **APIs:** STAFF invite/create/update return and accept `allowed_modules`; **login** + **accept-invite** include `user.allowed_modules`; **`GET/PATCH /api/v1/tenant/account/`** exposes `allowed_modules`.
- **Tests:** model/serializer round-trip, unknown/forbidden keys, migration/login evidence — see `tenant/users/tests/test_allowed_modules_acceptance.py`, `test_staff_modules.py`, `test_account_views.py`, `LoginViewTest`.

### Phase 2 — Backend enforcement (first vertical slice)

- **`user_has_module` / `IsTenantAdmin`** + **`required_tenant_module`** (and related helpers in `shared.permissions.tenant`).
- First slice proven (Operations and/or Finance per epic), then expanded — see Phase 3.

### Phase 3 — Backend enforcement (full tenant surface)

- Enforcement on **grantable** tenant admin APIs aligned to **`TENANT_MODULE_KEYS`**; **setup** split (checklist/templates vs **OWNER/ADMIN**-only wizard); **reports** vs **finance-overview** where applicable.
- **Write path:** `validate_allowed_modules_for_staff` on invite/serializers; **STAFF** PATCH modules via **`UpdateUserSerializer`**.
- **Table-driven tests:** `backend/tests/tenant/test_staff_tenant_module_matrix.py`, `test_staff_operations_module_enforcement.py`.
- **Testing settings:** `backend/config/settings/testing.py` (e.g. LocMem cache, hosts) for stable CI.

### Phase 4 — Admin UX: invite, edit, display

- **`StaffModuleAccessPicker`** — grouped checkboxes from **`navigationConfig.ADMIN`** ∩ **`STAFF_ASSIGNABLE_MODULE_KEYS`**; **`STAFF_MODULE_PRESETS`** (merge-only presets).
- **`CreateUserModal`**, **`UserDetailPage`** — STAFF `allowed_modules`; errors via **`parseApiValidationEnvelope`** / **`extractValidationErrors`** (`details` from global handler).
- Read-only **module access** card: **`getStaffModuleDisplayGroups`** + “Other”.
- **Vitest:** `staffModulePickerGroups.test.ts`, `errorUtils.test.ts`.

### Phase 5 — Frontend: nav, routes, forbidden UX

- **`filterAdminNavByModules`**, **`getNavigationForRole`:** STAFF sidebar = granted keys + **my-account** without requiring a module key; OWNER/ADMIN full nav.
- **`getStaffLandingPathFromModules`**, **`getTenantDashboardHomePath`:** first granted item in sidebar order; fallback **`/dashboard/settings/account`**; dashboard index / onboarding use tenant home helper.
- **`RequireModule`** on **`/dashboard/*`** admin routes per [MODULE_ACCESS.md](./MODULE_ACCESS.md); **`/dashboard/access-denied`** + **`moduleKey`** in location state.
- Exempt: **`/dashboard`**, **`/dashboard/settings/account`**, **`/dashboard/access-denied`**.
- **Vitest:** `navigationStaffModules.test.ts`.

### Ops / local dev (cross-cutting)

- Docker **entrypoint:** `migrate` then **`tenant_migrate_all`** (tenant Postgres schemas stay in sync with **`users.0006`** etc.).
- Vite **proxy** `/api`, `/media`; dev **axios baseURL** `''` when **`VITE_API_URL`** unset; **CORS** default includes **`http://127.0.0.1:5173`**.
- **DEBUG-only** invite URL log in **`UserService.send_invite_email_async`** (never enable in production).

---

## Decisions / assumptions

- **STAFF** is a first-class role (not “ADMIN + modules only”).
- **ADMIN** full academy admin = **`allowed_modules` NULL**; no module picker on ADMIN invite.
- **No `*`** wildcard for STAFF in v1; explicit non-empty key list.
- **JWT v1** does not carry `allowed_modules`; SPA syncs from login / invite / account into **`localStorage`** (`user_allowed_modules`); API enforcement uses **`request.user`**.
- **My Account** is not module-gated; aligns with Phase 0 “shared endpoints” policy in [MODULE_ACCESS.md](./MODULE_ACCESS.md).

---

## API contract

| Topic | Implementation |
|--------|------------------|
| **Field name** | **`allowed_modules`** — `string[]` for STAFF; `null` for legacy full ADMIN |
| **Login / accept-invite** | Response includes **`user.allowed_modules`** |
| **Current user** | **`GET/PATCH /api/v1/tenant/account/`** includes `allowed_modules` (STAFF: modules not self-editable via PATCH where enforced) |
| **JWT** | No `allowed_modules` claim in v1 |

---

## Module enum location

| Layer | Path |
|--------|------|
| Backend registry + validation | `backend/shared/permissions/module_keys.py` |
| Backend permissions | `backend/shared/permissions/tenant.py` |
| Frontend keys | `frontend/src/shared/constants/moduleKeys.ts` |
| Picker / presets / display groups | `frontend/src/shared/constants/staffModulePickerGroups.ts` |
| Nav + landing | `frontend/src/shared/nav/navigation.ts` |
| Route guard | `frontend/src/shared/components/common/RequireModule.tsx` |
| Backend matrix tests | `backend/tests/tenant/test_staff_tenant_module_matrix.py` |

---

## Known gaps (Phase 6 candidates)

- **Stale STAFF session** after admin edits `allowed_modules` — refetch account, or JWT claim + refresh.
- **E2E** not required by epic yet; manual Docker persona pass recommended.
- **Audit** trail for module grant changes not implemented.
- **Production:** `DEBUG` off; `FRONTEND_URL` / `VITE_API_URL` correct for deployed hosts.
- **Full `npm run build`** may still fail on unrelated `tsc` debt — use targeted Vitest until fixed.
- **COACH/PARENT** vs admin shell — product follow-up if needed.

---

## Commands run (regression checklist)

**Backend**

```bash
cd backend
python -m pytest tests/tenant/test_staff_tenant_module_matrix.py tests/tenant/test_staff_operations_module_enforcement.py -q
python -m pytest tenant/users/tests/test_allowed_modules_acceptance.py \
  tenant/users/tests/test_staff_modules.py \
  tenant/users/tests/test_account_views.py \
  tenant/users/tests/test_views.py::LoginViewTest -q
```

**Frontend**

```bash
cd frontend
npx vitest run src/shared/nav/__tests__/navigationStaffModules.test.ts
npx vitest run src/shared/constants/__tests__/staffModulePickerGroups.test.ts
npx vitest run src/shared/utils/__tests__/errorUtils.test.ts
```

**Docker**

```bash
docker compose exec -T frontend npm run test:run
docker compose exec -T backend python manage.py tenant_migrate_all
```

---

## Next phase should start from

- Record **`git rev-parse HEAD`** on the branch that contains all Phase **1–5** work plus ops/dev fixes above.

---

## Suggested Phase 6 scope

1. **Session / identity:** Account refetch on focus or **`allowed_modules` in JWT** + refresh when grants change.
2. **E2E:** STAFF subset → visible nav → forbidden deep link → access-denied + API **403**.
3. **Audit** (optional): who changed **`allowed_modules`**, when, old → new.
4. **CI / ops:** Postgres integration job with **`tenant_migrate_all`**; document production migration runbook.
5. **Polish:** Operator docs, remove or strictly gate dev-only logging.

---

*Replace the commit line when opening the Phase 6 PR.*
