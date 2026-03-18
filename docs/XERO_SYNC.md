# Xero Sync

## Overview

`sync_payments_to_xero` is a Celery task that attempts to sync unsynced platform payments to Xero and records the returned external reference on success. The current implementation is a stub and does not include a real OAuth2 or invoice creation flow.

## Required Environment Variables

- `XERO_CLIENT_ID`
- `XERO_CLIENT_SECRET`

These variables are documented for the future real integration. The current task stub does not use them yet.

## Manual Trigger

Run from the backend container:

```bash
python manage.py shell -c "from saas_platform.finance.tasks import sync_payments_to_xero; sync_payments_to_xero.delay()"
```

## Suggested Beat Schedule

Run the task periodically after the real Xero client is implemented. A reasonable default is every 15 minutes.

## Idempotency

- Only payments with `synced_at IS NULL` are processed.
- Successful syncs stamp `external_ref` and `synced_at`.
- Already-synced records are skipped on future runs.
- Per-record failures are logged and do not stop the rest of the batch.

## Current Limitations

- No OAuth2 handshake
- No real invoice payload mapping
- No retry/backoff policy beyond Celery task reruns
- No webhook reconciliation
