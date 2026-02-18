# Tests Directory

This directory contains all tests for the platform backend. Tests are organized by feature/module.

## Structure

```
tests/
├── __init__.py
├── subscriptions/          # Subscription and Plan model tests
│   ├── __init__.py
│   └── test_models.py
├── quotas/                 # Quota and Usage model/service tests
│   ├── __init__.py
│   ├── test_models.py
│   └── test_services.py
├── tenants/                # Academy model/service/API tests
│   ├── __init__.py
│   ├── test_models.py
│   ├── test_services.py
│   └── test_views.py
├── audit/                  # Audit logging tests
│   ├── __init__.py
│   └── test_audit.py
└── permissions/            # Permission class tests
    ├── __init__.py
    └── test_permissions.py
```

## Running Tests

### Using the test runner (recommended):
```bash
cd backend
python run_tests_fixed.py
```

### Using Django's test command:
```bash
python manage.py test tests --settings=config.settings.testing --verbosity=2
```

### Running specific test modules:
```bash
python manage.py test tests.subscriptions --settings=config.settings.testing
python manage.py test tests.quotas --settings=config.settings.testing
python manage.py test tests.tenants --settings=config.settings.testing
python manage.py test tests.audit --settings=config.settings.testing
python manage.py test tests.permissions --settings=config.settings.testing
```

## Test Coverage

- **Models**: Plan, Subscription, TenantQuota, TenantUsage, Academy, AuditLog
- **Services**: AcademyService, QuotaService
- **APIs**: AcademyViewSet (POST, GET, PATCH endpoints)
- **Permissions**: IsSuperadmin, IsPlatformAdmin
- **Audit**: AuditService logging functionality

## Notes

- All tests use absolute imports (e.g., `from platform.subscriptions.models import Plan`)
- Tests are isolated and can run independently
- Uses in-memory SQLite database for fast execution
- Migrations are disabled for testing speed
