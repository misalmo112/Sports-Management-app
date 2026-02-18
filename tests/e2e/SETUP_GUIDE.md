# E2E Test Setup Guide

This guide will help you set up and run the E2E test suite for the Sports Academy Management System.

## Prerequisites

1. **Docker and Docker Compose** installed and running
2. **Node.js** (v18+) and npm installed
3. **Backend services** running via `docker-compose`

## Quick Start

### 1. Start Backend Services

```bash
# From project root
docker-compose up -d

# Wait for services to be healthy
docker-compose ps

# Run migrations
docker-compose exec backend python manage.py migrate
```

### 2. Create Test Users

**Option A: Using Setup Script (Recommended)**

```bash
# Windows PowerShell
cd tests/e2e
.\setup-test-users.ps1

# Linux/Mac
cd tests/e2e
chmod +x setup-test-users.sh
./setup-test-users.sh
```

**Option B: Manual Setup**

```bash
# Create superadmin
docker-compose exec backend python manage.py createsuperuser
# Email: superadmin@test.com
# Password: SuperAdmin123!
```

**Note:** Admin, Coach, and Parent users will be created automatically when the test academy is set up (via global setup), but they need to accept invites. For fully automated tests, you may need to accept invites programmatically or use test-only endpoints.

### 3. Install Test Dependencies

```bash
cd tests/e2e
npm install
npx playwright install chromium
```

### 4. Run Tests

```bash
# Run all tests
npm run test:e2e

# Run smoke tests only (fastest)
npm run test:smoke

# Run security tests (critical)
npm run test:e2e:security

# Run with UI (interactive)
npm run test:ui

# Run in debug mode
npm run test:debug
```

## Current Test Status

**Last Run:** 19 passed, 23 failed, 156 skipped

### Known Issues

#### 1. Backend Returns 404 Instead of 401/400 (18 tests)

**Symptom:** Tests expect 400/401 but receive 404.

**Possible Causes:**
- Backend endpoints not properly configured
- URL routing issues
- Middleware blocking requests

**Troubleshooting:**

```bash
# Test endpoint manually
curl -X POST http://localhost:8000/api/v1/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'

# Should return 400 or 401, not 404
```

**Expected Endpoints:**
- Login: `POST /api/v1/auth/token/`
- Invite Accept: `POST /api/v1/auth/invite/accept/`
- Tenant Overview: `GET /api/v1/tenant/overview/`

**Fix:** Verify backend URL routing in `backend/config/urls.py` and `backend/tenant/users/urls.py`.

#### 2. Frontend Routing Issues (2 tests)

**Symptom:** 
- Login doesn't redirect to dashboard
- Unauthenticated users can access `/onboarding`

**Fix:** Add authentication guards and redirect logic in React Router.

#### 3. Missing Test Users (156 tests skipped)

**Symptom:** Tests skip because users don't exist.

**Fix:** Run setup script or create users manually (see step 2 above).

## Test Structure

```
tests/e2e/
├── helpers/              # Test utilities
│   ├── auth.helper.ts    # Authentication helpers
│   ├── api.helper.ts     # API request helpers
│   ├── tenant.helper.ts  # Academy/onboarding helpers
│   ├── data.factory.ts   # Test data factories
│   └── assertions.helper.ts # Custom assertions
├── fixtures/             # Test data fixtures
├── *.spec.ts            # Test suites
├── global.setup.ts      # Test data seeding
└── playwright.config.ts # Playwright configuration
```

## Test Suites

| Suite | Tag | Description |
|-------|-----|-------------|
| smoke.spec.ts | `@smoke` | Critical app functionality |
| auth.spec.ts | `@auth` | Authentication flows |
| platform.spec.ts | `@platform` | Superadmin operations |
| onboarding.spec.ts | `@onboarding` | Academy onboarding wizard |
| admin.spec.ts | `@admin` | Tenant CRUD operations |
| coach.spec.ts | `@coach` | Coach permissions |
| parent.spec.ts | `@parent` | Parent permissions |
| media-quota.spec.ts | `@quota` | Storage quota enforcement |
| security-isolation.spec.ts | `@security` | Multi-tenant isolation |

## Running Specific Test Suites

```bash
# Run by tag
npm run test:e2e:security  # Security tests
npm run test:e2e:admin     # Admin tests
npm run test:e2e:platform  # Platform tests

# Run by file
npx playwright test smoke.spec.ts
npx playwright test auth.spec.ts
```

## Debugging Failed Tests

### View Test Report

```bash
npm run report
```

### Run in Debug Mode

```bash
npm run test:debug
```

### Run with UI

```bash
npm run test:ui
```

### Check Test Screenshots

Failed tests automatically capture screenshots in `test-results/` directory.

## Environment Variables

You can override default URLs:

```bash
# Windows PowerShell
$env:API_BASE_URL="http://localhost:8000/api/v1"
$env:FRONTEND_URL="http://localhost:5173"
npm run test:e2e

# Linux/Mac
API_BASE_URL=http://localhost:8000/api/v1 \
FRONTEND_URL=http://localhost:5173 \
npm run test:e2e
```

## Troubleshooting

### Backend Not Accessible

```bash
# Check if backend is running
docker-compose ps

# Check backend logs
docker-compose logs backend

# Test health endpoint
curl http://localhost:8000/health/
```

### Frontend Not Accessible

```bash
# Check if frontend is running
docker-compose ps frontend

# Check frontend logs
docker-compose logs frontend

# Test frontend
curl http://localhost:5173
```

### Database Issues

```bash
# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
docker-compose exec backend python manage.py migrate
```

### Playwright Browser Issues

```bash
# Reinstall browsers
npx playwright install --force
```

## Next Steps

1. ✅ **Fixed:** `api.helper.ts` response.headers() bug
2. ⏳ **Fix:** Backend 404 issues (verify URL routing)
3. ⏳ **Fix:** Frontend routing (add auth guards)
4. ⏳ **Setup:** Create test users
5. ⏳ **Update:** Test assertions if needed

## Support

For issues or questions:
1. Check `ERROR_REPORT.md` for detailed error analysis
2. Review test output and screenshots
3. Verify backend and frontend are running
4. Check Docker container logs
