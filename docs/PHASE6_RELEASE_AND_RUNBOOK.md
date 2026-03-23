# Phase 6 — Admin release notes and manual runbook

Use this content in the PR description or customer-facing release notes as appropriate.

## Admin-facing release notes

- **Delegated staff (STAFF)** continue to see only the admin areas granted in **module access**; **Owner** and **full Admin** still see the full admin product.
- **My Account** (`/dashboard/settings/account`) remains available to every signed-in tenant user; it is not module-gated.
- **Safeguard:** You can no longer **deactivate** or **remove** the last **active, verified** Owner or full Admin for an academy through the user management API. Platform support (superuser) can still act in emergencies.
- **Audit (support):** Changes to a staff member’s **module access** list are recorded in platform audit logs (`USER` resource, before/after module keys).

## Manual QA runbook

Run against a non-production tenant (e.g. local Docker). Use three personas where possible.

### 1. STAFF — attendance-only

- Invite or edit a user as **STAFF** with only **`attendance`** (and **`classes`** if marking requires it—match your product flow).
- Sign in as that user: sidebar should show only granted areas; landing should be the first granted item or **My Account** fallback.
- Open a deep link to a non-granted admin route (e.g. **Users**): expect **access denied** in the SPA and **403** from the API if applicable.
- Confirm **My Account** still loads.

### 2. STAFF — finance-only

- Grant modules such as **`finance-items`**, **`invoices`**, **`receipts`** (and **`finance-overview`** if used).
- Sign in: finance areas visible; students/settings not granted should be hidden or blocked as above.

### 3. Owner / full Admin

- Sign in as **OWNER** or **ADMIN**: full admin nav, no erroneous **403** on tenant admin APIs covered by the matrix tests.
- With **two** elevated admins, deactivate one: should succeed. With **one** left, attempt to deactivate or delete them: should **fail** with a clear validation error (unless using a platform superuser).

## Regression commands (developers)

```bash
cd backend
python -m pytest tenant/users/tests/test_last_elevated_admin.py tenant/users/tests/test_views.py -q
python -m pytest tests/tenant/test_staff_tenant_module_matrix.py tests/tenant/test_staff_operations_module_enforcement.py -q
python -m pytest tests/audit/test_audit.py -q
```

After deploy, run **`python manage.py migrate`** and **`tenant_migrate_all`** for Postgres tenant schemas per your ops runbook.
