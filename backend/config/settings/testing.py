"""
Testing settings for Sports Academy Management System.
"""
from .base import *

# Use in-memory database for testing
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Disable migrations for faster tests
class DisableMigrations:
    def __contains__(self, item):
        return True
    
    def __getitem__(self, item):
        return None

MIGRATION_MODULES = DisableMigrations()

# Password hashing for tests (faster)
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Disable logging during tests
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'null': {
            'class': 'logging.NullHandler',
        },
    },
    'root': {
        'handlers': ['null'],
    },
}

# Override SECRET_KEY for testing (not required in testing)
SECRET_KEY = os.getenv('SECRET_KEY', 'test-secret-key-for-testing-only')

# Override database settings to not require DB credentials
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Add platform apps for testing (only if not already in base)
# Note: subscriptions is already in base.py, so we don't add it again
# INSTALLED_APPS += [
#     'saas_platform.subscriptions.apps.SubscriptionsConfig',  # Already in base
#     'saas_platform.quotas',  # Already in base
#     'saas_platform.tenants',  # Already in base
#     'saas_platform.audit',  # Already in base
#     'shared.permissions',
#     'django_filters',  # Already in base
#     'tenant.media',  # Already in base
# ]

# Make celery optional for testing
try:
    import celery
except ImportError:
    # Remove celery_app from INSTALLED_APPS if celery is not installed
    if 'celery_app' in INSTALLED_APPS:
        INSTALLED_APPS.remove('celery_app')