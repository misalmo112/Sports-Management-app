# Testing Notes

## Platform Module Naming Conflict

**Important**: The `backend/platform` directory name conflicts with Python's built-in `platform` module. This causes import errors when running tests.

### The Problem

When Python tries to import `platform.python_implementation()` from the standard library, it finds our local `backend/platform` package instead, causing:
```
ImportError: cannot import name 'python_implementation' from 'platform'
```

### Solutions

#### Option 1: Rename the Platform Directory (Recommended for Production)

Rename `backend/platform` to `backend/platform_layer` or `backend/saas_platform` to avoid the conflict. This requires:
- Updating all imports
- Updating INSTALLED_APPS
- Updating URL includes

#### Option 2: Workaround for Testing

1. Run tests from a directory that doesn't include `platform` in the path
2. Use a virtual environment and ensure proper Python path configuration
3. Temporarily rename the platform directory during test runs

#### Option 3: Modify platform/__init__.py

Add this to `backend/platform/__init__.py`:
```python
# Re-export standard library platform if needed
import sys
if 'platform.python_implementation' not in sys.modules:
    import platform as _stdlib_platform
    sys.modules['_stdlib_platform'] = _stdlib_platform
```

### Current Test Status

Tests are implemented but cannot run due to:
1. Platform module naming conflict
2. Missing dependencies (celery, django-filter, etc.)
3. Missing INSTALLED_APPS configuration

### To Run Tests Successfully

1. **Install dependencies**:
   ```bash
   pip install django-filter celery
   ```

2. **Add apps to INSTALLED_APPS** in `config/settings/testing.py`:
   ```python
   INSTALLED_APPS += [
       'platform.subscriptions.apps.SubscriptionsConfig',
       'platform.quotas',
       'platform.tenants',
       'platform.audit',
       'shared.permissions',
       'django_filters',
   ]
   ```

3. **Resolve platform naming conflict** (see options above)

4. **Create/configure User model** with `role` field or update permission classes

5. **Run tests**:
   ```bash
   python manage.py test platform.subscriptions platform.quotas platform.tenants platform.audit shared.permissions --settings=config.settings.testing
   ```

## Test Coverage

All test files have been created:
- ✅ `platform/subscriptions/tests/test_models.py`
- ✅ `platform/quotas/tests/test_models.py`
- ✅ `platform/quotas/tests/test_services.py`
- ✅ `platform/tenants/tests/test_models.py`
- ✅ `platform/tenants/tests/test_services.py`
- ✅ `platform/tenants/tests/test_views.py`
- ✅ `shared/permissions/tests/test_permissions.py`
- ✅ `platform/audit/tests/test_audit.py`

## Test Implementation Status

All tests are written and ready to run once the configuration issues are resolved.
