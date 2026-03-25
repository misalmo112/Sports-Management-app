# Xero Sync

## Overview

`sync_payments_to_xero` is a Celery task that attempts to sync unsynced platform payments to Xero and records the returned external reference on success. The current implementation is a stub and does not include a real OAuth2 or invoice creation flow.

## Credential Configuration

- `XERO_CLIENT_ID`
- `XERO_CLIENT_SECRET`

If either variable is missing, the task logs a warning and exits cleanly (no retry).

## Manual Trigger

Run from the backend container:

```bash
python manage.py shell -c "from saas_platform.finance.tasks import sync_payments_to_xero; sync_payments_to_xero.delay()"
```

## Suggested Beat Schedule

The `sync-payments-to-xero` beat entry runs every 15 minutes.

## Idempotency

- Only payments with `synced_at IS NULL` are processed.
- Successful syncs stamp `external_ref` and `synced_at`.
- Already-synced records are skipped on future runs.
- Per-record failures are logged and do not stop the rest of the batch.

## Current Limitations

- No OAuth2 handshake
- No real invoice payload mapping
- `NotImplementedError` only fires when credentials are present (because the `XeroClient` is instantiated only when env vars exist).
- No webhook reconciliation
