# Sports Academy Management System

A multi-tenant SaaS platform for managing sports academies and training centers.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

Verify installation:

```bash
docker --version
docker-compose --version
```

## Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd Sports-Management-app
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Update the critical values in `.env`:

- `SECRET_KEY`
- `JWT_SECRET_KEY`
- `DB_PASSWORD`
- `MINIO_ROOT_PASSWORD`
- `COMPOSE_PROJECT_NAME` (keep stable to avoid Docker volume warnings)

### 3. Start the stack

```bash
docker-compose up
```

Detached mode:

```bash
docker-compose up -d
```

### 4. Database schemas (migrations) vs data

- **Schemas**: Your teammate *will* get the same Postgres schema **as long as your Django migrations are committed to GitHub**. On every start, **`backend`** and **`celery-worker`** use `backend/entrypoint.sh`, which runs:
  - `python manage.py migrate --noinput` (public schema)
  - `python manage.py tenant_migrate_all` (per-academy Postgres tenant schemas; no-op on SQLite)
- **Data**: Your teammate will **not** get your local Postgres rows (your existing dev data) unless you export/import it explicitly.

Manual migration (rarely needed):

```bash
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py tenant_migrate_all
```

### 5. Create the initial superuser

```bash
docker-compose exec backend python manage.py createsuperuser
```

## Service URLs

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- MinIO Console: http://localhost:9001

## Common Commands

### Start and stop

```bash
docker-compose up
docker-compose up -d
docker-compose down
docker-compose down -v
docker-compose logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs celery-worker
```

### Database and shell access

```bash
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py shell
docker-compose exec postgres psql -U postgres -d sports_academy_dev
```

### Masters data sync (currencies, timezones, exchange rates)

Platform masters are synced from [Frankfurter](https://www.frankfurter.app/) (currencies + exchange rates) and [WorldTimeAPI](https://worldtimeapi.org/) (timezones). No API keys required. Sync runs automatically via Celery Beat (daily for Frankfurter, weekly for WorldTimeAPI), or run manually:

```bash
docker-compose exec backend python manage.py sync_frankfurter
docker-compose exec backend python manage.py sync_worldtimeapi
```

Optional env vars: `FRANKFURTER_BASE_URL`, `FRANKFURTER_RATE_BASES` (e.g. `EUR,USD`), `WORLDTIMEAPI_BASE_URL`. See `docs/ENV_CONTRACT.md`.

### Service management

```bash
docker-compose restart backend
docker-compose up --build backend
docker-compose ps
docker-compose exec backend <command>
docker-compose exec frontend <command>
```

## Architecture

This project enforces a strict split between:

- Platform layer: SUPERADMIN operations, academy management, subscriptions, finance, analytics, and audit
- Tenant layer: academy-scoped modules such as onboarding, students, classes, attendance, billing, media, reports, facilities, and staff

Implemented platform finance capabilities include:

- academy subscription payment ledger management
- operational expense tracking
- finance summary metrics including MRR, ARR, revenue, expenses, churn, and P&L
- monthly payment CSV export
- Xero sync task scaffolding for future automation

## Project Structure

```text
.
|-- backend/
|   |-- config/           # Django settings and root URLs
|   |-- saas_platform/    # Platform apps: tenants, subscriptions, finance, analytics, audit
|   |-- tenant/           # Academy-scoped apps
|   |-- shared/           # Shared middleware, permissions, utilities
|   `-- Dockerfile
|-- frontend/
|   |-- src/
|   `-- Dockerfile
|-- docs/
|-- docker-compose.yml
|-- .env.example
`-- README.md
```

## Troubleshooting

### Running backend tests

- Install backend dependencies (including Celery) locally:

```bash
cd backend
pip install -r requirements.txt
```

- Preferred: use the Django test runner via the helper script:

```bash
cd backend
python run_tests.py  # or: python run_tests.py tests.tenants tests.subscriptions
```

- Alternatively, run tests directly with `manage.py` and the testing settings:

```bash
cd backend
DJANGO_SETTINGS_MODULE=config.settings.testing python manage.py test
```

Running `pytest` from the `backend/` directory also works, because `backend/conftest.py`
configures `DJANGO_SETTINGS_MODULE` and calls `django.setup()` before tests are collected.

### Services will not start

1. Check Docker is running: `docker ps`
2. Check port conflicts on `8000`, `5173`, `5432`, `6379`, `9000`, and `9001`
3. Verify `.env` exists and contains required values
4. Inspect logs with `docker-compose logs`

### Database connection issues

1. Ensure Postgres is healthy: `docker-compose ps`
2. Confirm `DATABASE_URL` points to the `postgres` service inside Docker
3. If running Django on the host instead of inside Docker, use `localhost` instead of `postgres`

### Frontend cannot reach backend

1. Check `VITE_API_BASE_URL`
2. Confirm backend is running
3. Verify CORS settings

### Celery worker issues

1. Check Redis status
2. Inspect `docker-compose logs celery-worker`
3. Verify the configured broker URL

## Additional Documentation

- `docs/ARCHITECTURE.md`
- `docs/PROJECT_DOCUMENTATION.md`
- `docs/MODELS.md`
- `docs/ROLE_ROUTE_MAP.md`
- `docs/NAVIGATION_MAP.md`
- `docs/NAVIGATION_COVERAGE.md`
- `docs/API_CONVENTIONS.md`
- `docs/PERMISSIONS.md`
- `docs/DOCUMENTATION_MAINTENANCE.md`
- `docs/ENV_CONTRACT.md`
- `docs/XERO_SYNC.md`

## License

[Add license information here]
