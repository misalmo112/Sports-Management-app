# Error Logging and Messaging Plan

Status: Proposal document. This file describes a planned design and does not represent the current implemented API/error contract unless another current-state doc says so.

## Goals
- Provide clear, user-friendly error messages for tenant users.
- Capture structured errors with tenant context for superadmin visibility.
- Enable debugging with correlation IDs and consistent payloads.

## Non-Goals
- Replacing APM/observability vendors.
- Storing sensitive data (passwords, tokens, card data) in logs.

## Error Taxonomy
Use consistent categories and codes across backend and frontend:
- `VALIDATION_ERROR` (400)
- `AUTHENTICATION_ERROR` (401)
- `AUTHORIZATION_ERROR` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `RATE_LIMIT` (429)
- `DEPENDENCY_ERROR` (502/503)
- `INTERNAL_ERROR` (500)

## API Error Payload Contract
Return a structured JSON response for all API errors:
```
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "Please fix the highlighted fields.",
  "details": {
    "field_errors": { "email": ["Invalid email"] },
    "debug": "Optional developer-facing detail (omitted in production)"
  },
  "request_id": "uuid-or-short-id",
  "tenant": {
    "academy_id": "uuid",
    "academy_slug": "optional"
  },
  "timestamp": "ISO-8601"
}
```
Notes:
- `message` is user-safe and localized later if needed.
- `details.debug` included only in non-production or for superadmin requests.
- `request_id` is echoed in response headers and UI.

## Backend Plan
1) **Central Error Handler**
   - Add a DRF `EXCEPTION_HANDLER` that maps exceptions to the taxonomy.
   - Normalize validation errors and permission errors into the standard payload.
2) **Request Correlation**
   - Add middleware to attach `request_id` to request context and response headers.
3) **Structured Logging**
   - Log errors with fields: `request_id`, `academy_id`, `user_id`, `path`, `method`, `status_code`, `code`, `message`.
4) **ErrorLog Model**
   - Create `platform/error_logs` (superadmin scope) with fields:
     - `id`, `created_at`
     - `request_id`, `path`, `method`, `status_code`, `code`
     - `message`, `stacktrace` (optional, sanitized)
     - `academy_id`, `user_id`, `role`
     - `service` (backend/frontend)
     - `environment`
5) **API Endpoints**
   - `GET /api/v1/platform/error-logs/` (filters: date range, academy_id, code, status, request_id)
   - `GET /api/v1/platform/error-logs/:id/`
6) **Safety**
   - Redact PII in `message` and `details.debug`.
   - Strip headers like Authorization before logging.

## Frontend Plan
1) **User-Facing Errors**
   - Map `code` to friendly copy with guidance and retry.
   - Show `request_id` in error UI for support.
2) **Client Error Capture**
   - Add a global error boundary + fetch error handler to post client errors to:
     - `POST /api/v1/platform/error-logs/ingest/` (superadmin-only or service key).
3) **Superadmin Dashboard**
   - Error logs page with filters and detail drawer:
     - Request ID, Academy, User, Code, Status, Endpoint, Time.

## Privacy and Retention
- Retain error logs for 30-90 days (configurable).
- Store minimal PII; prefer hashed identifiers where possible.
- Avoid storing request/response bodies unless explicitly enabled for debugging.

## Configuration (ENV)
- `ERROR_LOGGING_ENABLED=true`
- `ERROR_LOG_RETENTION_DAYS=30`
- `ERROR_LOG_STACKTRACE_ENABLED=false` (true in staging only)
- `ERROR_LOG_CLIENT_INGEST_ENABLED=true`

## Testing Plan
- Unit tests for exception handler mapping.
- API tests for error payload shape.
- Permission tests for superadmin-only access.
- Frontend tests for error UI and request_id display.

## Rollout
1) Ship backend handler + model + endpoint.
2) Update frontend error handling and dashboard.
3) Enable client ingest in staging.
4) Verify logs from multiple academies.
5) Enable in production.
