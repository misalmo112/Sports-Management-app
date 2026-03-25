# Quotas

## Overview

This document describes the current quota model used by the repository. Quotas are enforced at the API and service layers to block operations that would exceed an academy's allowed limits.

## Current Quota Types

The implemented quota keys are:

- `storage_bytes`
- `max_students`
- `max_coaches`
- `max_admins`
- `max_classes`

These originate from `Plan.limits_json` and may be overridden by `Subscription.overrides_json`.

## Current Data Model

### Source values

- `Plan.limits_json` stores default limits.
- `Subscription.overrides_json` stores academy-specific overrides.

### Denormalized effective quota

`saas_platform.quotas.models.TenantQuota` stores the effective limits per academy:

- `storage_bytes_limit`
- `max_students`
- `max_coaches`
- `max_admins`
- `max_classes`

This record is updated by `saas_platform.quotas.services.QuotaService.update_tenant_quota`.

### Current usage tracking

`saas_platform.quotas.models.TenantUsage` stores current usage:

- `storage_used_bytes`
- `students_count`
- `coaches_count`
- `admins_count`
- `classes_count`
- `counts_computed_at`

Storage is the authoritative counter that is updated atomically around media changes. Count quotas are computed on demand in the shared quota helpers.

## Effective Quota Resolution

Current effective quota calculation is implemented in `QuotaService.calculate_effective_quota(academy)`:

1. find the current subscription
2. start from `plan.limits_json`
3. merge `subscription.overrides_json`
4. return the merged limits

If no current subscription exists, quota checks fail closed for create operations that depend on quota validation.

## Enforcement Paths

### Decorator-based enforcement

`shared.decorators.quota.check_quota` is used on create/upload-style view methods.

Current behavior:

- requires `request.academy`
- calculates the effective quota
- determines current usage
- blocks the request with `403` if `current + requested > limit`

### Service-layer enforcement

`shared.services.quota.check_quota_before_create` provides reusable quota validation for service flows and raises `QuotaExceededError` when the requested operation would exceed quota.

### Current usage counting

Current count usage is derived on demand from the live tables for:

- students
- coaches
- classes
- admins

Storage usage is read from `TenantUsage.storage_used_bytes`.

## Current Behavior Rules

- Storage has three states: `ok`, `warning`, and `exceeded`.
  - `warning`: usage >= `storage_warning_threshold_pct` (default `80%`). Uploads are allowed and a `X-Storage-Status: warning` header is attached on successful uploads.
  - `exceeded`: usage >= `100%` (>= effective `storage_bytes_limit`). Uploads are blocked with HTTP `403` and `storage_status: exceeded` in the response body.
  - The warning threshold is configurable per-academy by the platform admin via the quota override endpoint (`PATCH /api/v1/platform/academies/{id}/quota`).
- `TenantUsage.storage_used_bytes` is maintained by Django signals (`post_save`/`post_delete`) on `MediaFile`, and a safety-net Celery reconcile task runs every 30 minutes to correct drift.
- Daily storage snapshots are stored in `StorageSnapshot` for growth tracking and quota-exhaustion projection (`days_to_quota`).
- Media uploads check storage quota before writing files.
- Student, coach, class, and user creation flows may check quota before creation.
- Superadmin can still update subscription/quota inputs at the platform layer, but tenant create operations are blocked when academy quota is exceeded.

## Current Code Paths

- `backend/saas_platform/quotas/models.py`
- `backend/saas_platform/quotas/services.py`
- `backend/shared/decorators/quota.py`
- `backend/shared/services/quota.py`

## Documentation Rules

- Keep this file current-state only.
- If future quota policy changes are proposed, document them in a plan doc rather than here.
- When quota keys or enforcement paths change, update this doc together with the platform models or shared quota helpers.

## Related References

- `docs/MODELS.md`
- `docs/PROJECT_DOCUMENTATION.md`
- `docs/DOCUMENTATION_MAINTENANCE.md`
