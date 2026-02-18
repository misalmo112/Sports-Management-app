# Academy Admin Panel E2E Test Suite

## Overview

This test suite provides comprehensive end-to-end testing for the Academy Admin Panel from the frontend UI perspective. It tests all admin panel actions using credentials set via `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` (e.g. in `.env.e2e` — never commit real credentials).

## Test Coverage

The test suite covers the following areas:

1. **Authentication & Navigation** - Login, navigation menu, role-based access
2. **Overview Dashboard** - Dashboard cards, statistics, alerts
3. **Students Management** - List, create, view, edit, search, filter
4. **Classes Management** - List, create, view, edit, enrollments
5. **Attendance Management** - View, mark attendance, filtering
6. **Finance Management** - Billing items, invoices, receipts (CRUD operations)
7. **User Management** - List users, invite coach, invite parent
8. **Settings** - Locations, sports, age categories, terms, pricing
9. **Media Management** - View media library, upload (if quota allows)
10. **Reports** - View reports page
11. **Complaints** - View complaints (if accessible)

## Running the Tests

### Prerequisites

1. Ensure Docker services are running:
   ```bash
   docker-compose up -d
   ```

2. Ensure frontend is accessible at `http://localhost:5173`

3. Ensure backend is accessible at `http://localhost:8000`

4. The test account (set via `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`) must exist and have ADMIN role

### Run All Admin Panel Tests

```bash
cd tests/e2e
npm run test:e2e:admin-panel
```

### Run Tests and Generate Report

```bash
cd tests/e2e
npm run test:admin-panel:with-report
```

This will:
1. Run all admin panel tests
2. Generate a detailed markdown report at `academy-admin-panel-report.md`

### Run Tests with UI (Interactive)

```bash
cd tests/e2e
npm run test:ui -- --grep @admin-panel
```

### Run Tests in Debug Mode

```bash
cd tests/e2e
npm run test:debug -- --grep @admin-panel
```

## Test Report

After running tests, generate a detailed report:

```bash
cd tests/e2e
npm run report:admin-panel
```

The report will be generated at: `tests/e2e/academy-admin-panel-report.md`

### Report Contents

The report includes:

- **Test Summary** - Total tests, passed, failed, skipped, duration, pass rate
- **Test Results by Category** - Results grouped by feature area
- **Detailed Test Logs** - For each test: status, duration, errors, screenshots
- **Coverage Report** - List of all tested actions
- **Issues Found** - Any failed tests with error details
- **Recommendations** - Suggestions for improvements

## Test Structure

```
tests/e2e/
├── academy-admin-panel.spec.ts    # Main test file
├── helpers/
│   ├── ui.helper.ts                # UI interaction helpers
│   └── frontend.helper.ts          # Frontend-specific helpers
├── scripts/
│   └── generate-report.ts         # Report generation script
└── academy-admin-panel-report.md   # Generated test report
```

## Helper Functions

### UI Helper (`ui.helper.ts`)

Provides functions for:
- `login(email, password)` - Login via UI
- `navigateTo(path)` - Navigate to a route
- `clickNavItem(text)` - Click navigation menu item
- `clickButton(text)` - Click a button by text
- `fillField(label, value)` - Fill a form field by label
- `waitForTable()` - Wait for table to load
- `search(query)` - Search in search input
- And more...

### Frontend Helper (`frontend.helper.ts`)

- `loginViaUI(page, email, password)` - Login helper function
- `isFrontendAvailable()` - Check if frontend is accessible

## Test Data

The tests use unique test data with timestamps to avoid conflicts:
- Student names: `TestStudent{timestamp}`
- Class names: `Test Class {timestamp}`
- Email addresses: `coach-e2e-{timestamp}@test.com`

## Handling Test Failures

### Common Issues

1. **Frontend Not Available**
   - Ensure frontend is running: `docker-compose ps frontend`
   - Check frontend logs: `docker-compose logs frontend`

2. **Login Fails**
   - Verify account exists (credentials from E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD)
   - Check backend is running: `docker-compose ps backend`
   - Verify account has ADMIN role

3. **Onboarding Not Complete**
   - Some tests may skip if academy onboarding is incomplete
   - Complete onboarding via UI or API

4. **Quota Exceeded**
   - Some tests may skip if quota limits are reached
   - Tests handle quota errors gracefully

### Screenshots

Failed tests automatically capture screenshots in `test-results/` directory.

## Maintenance

### Updating Tests

When UI changes:
1. Update selectors in `ui.helper.ts` if needed
2. Update test expectations in `academy-admin-panel.spec.ts`
3. Re-run tests to verify

### Adding New Tests

1. Add test to appropriate `test.describe` block in `academy-admin-panel.spec.ts`
2. Use UI helper functions for interactions
3. Follow existing test patterns
4. Update coverage report in `generate-report.ts` if needed

## Notes

- Tests are designed to be independent where possible
- Tests handle missing data gracefully (skip if no data)
- Tests use flexible selectors to handle UI variations
- Tests include proper wait strategies for async operations
