"""
Base settings for Sports Academy Management System.
"""
import os
from pathlib import Path
from django.core.exceptions import ImproperlyConfigured

# Load environment variables from .env if available
try:
    from dotenv import load_dotenv
    _env_path = (Path(__file__).resolve().parent.parent.parent.parent / '.env')
    if not _env_path.exists():
        _env_path = (Path(__file__).resolve().parent.parent.parent / '.env')
    load_dotenv(dotenv_path=_env_path)
except Exception:
    pass

# Try to import dj_database_url (optional dependency)
try:
    import dj_database_url
except ImportError:
    dj_database_url = None

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Environment variables
def get_env_variable(var_name, default=None, required=True):
    """Get environment variable or return default."""
    value = os.getenv(var_name, default)
    if value is None and required:
        raise ImproperlyConfigured(f"Set the {var_name} environment variable")
    return value

# SECURITY WARNING: keep the secret key used in production secret!
# Default for testing only - must be set in production
SECRET_KEY = get_env_variable('SECRET_KEY', default='django-insecure-test-key-change-in-production', required=False)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'rest_framework',
    'corsheaders',
    'django_filters',
    
    # Celery (optional - will be removed in testing if not available)
    'celery_app',
    
    # Local apps (will be added as they are created)
    # 'saas_platform.accounts',
    'shared.tenancy.apps.TenancyConfig',
    'saas_platform.tenants',
    'saas_platform.subscriptions',
    'saas_platform.finance.apps.FinanceConfig',
    'saas_platform.quotas',
    'saas_platform.analytics',
    'saas_platform.audit',
    'saas_platform.masters.apps.MastersConfig',
    'tenant.onboarding',
    'tenant.students',
    'tenant.coaches',
    'tenant.classes',
    'tenant.attendance',
    'tenant.users',
    'tenant.billing',
    'tenant.media',
    'tenant.facilities',
    'tenant.overview',
    'tenant.reports',
    'tenant.communication',
    # etc.
]

# Add drf_spectacular if available (optional)
try:
    import drf_spectacular
    INSTALLED_APPS.append('drf_spectacular')
except ImportError:
    pass

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'shared.middleware.request_id.RequestIdMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'shared.middleware.academy_context.AcademyContextMiddleware',
    'shared.middleware.tenant_schema.TenantSchemaMiddleware',
    'shared.middleware.onboarding_check.OnboardingCheckMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
if os.getenv('DATABASE_URL') and dj_database_url:
    DATABASES = {
        'default': dj_database_url.parse(os.getenv('DATABASE_URL'))
    }
elif os.getenv('DB_NAME'):
    # Only configure PostgreSQL if DB_NAME is provided
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '5432'),
            'NAME': get_env_variable('DB_NAME', required=True),
            'USER': get_env_variable('DB_USER', required=True),
            'PASSWORD': get_env_variable('DB_PASSWORD', required=True),
            'CONN_MAX_AGE': int(os.getenv('DB_CONN_MAX_AGE', '600')),
        }
    }
else:
    # Default to persistent SQLite for development if no DB config
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': str(BASE_DIR / 'db.sqlite3'),
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = os.getenv('LANGUAGE_CODE', 'en-us')
TIME_ZONE = os.getenv('TIME_ZONE', 'UTC')
USE_I18N = True
USE_TZ = os.getenv('USE_TZ', 'True') == 'True'

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = []

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# CORS settings
CORS_ALLOWED_ORIGINS = os.getenv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:5173,http://127.0.0.1:5173',
).split(',')
CORS_ALLOW_CREDENTIALS = True
# Allow custom headers for academy context
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-academy-id',  # Custom header for tenant isolation
    'x-request-id',
]

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'shared.authentication.TenantAwareJWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': int(os.getenv('API_PAGE_SIZE', '20')),
    'EXCEPTION_HANDLER': 'shared.exceptions.handler.api_exception_handler',
}

# Cache (used by bulk-import preview tokens across Gunicorn workers)
# If left unconfigured, Django falls back to a per-process in-memory cache,
# which breaks preview/commit when requests hit different workers.
_redis_cache_url = os.getenv('REDIS_URL')
if _redis_cache_url:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': _redis_cache_url,
        }
    }
else:
    # Safe fallback for environments that do not run Redis
    # (e.g. unit tests using sqlite in-memory).
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'sports-academy-locmem-cache',
        }
    }

# Add drf_spectacular schema class if available
try:
    import drf_spectacular
    REST_FRAMEWORK['DEFAULT_SCHEMA_CLASS'] = 'drf_spectacular.openapi.AutoSchema'
except ImportError:
    pass

# JWT Settings
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(seconds=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRATION', '3600'))),
    'REFRESH_TOKEN_LIFETIME': timedelta(seconds=int(os.getenv('JWT_REFRESH_TOKEN_EXPIRATION', '604800'))),
    'ALGORITHM': os.getenv('JWT_ALGORITHM', 'HS256'),
    'SIGNING_KEY': get_env_variable('JWT_SECRET_KEY', default='test-jwt-secret-key-for-testing-only', required=False),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Storage settings (S3/MinIO) - optional for testing
if os.getenv('AWS_S3_ENDPOINT_URL'):
    try:
        DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
        STATICFILES_STORAGE = 'storages.backends.s3boto3.S3StaticStorage'
        
        AWS_ACCESS_KEY_ID = get_env_variable('AWS_ACCESS_KEY_ID', required=False)
        AWS_SECRET_ACCESS_KEY = get_env_variable('AWS_SECRET_ACCESS_KEY', required=False)
        AWS_STORAGE_BUCKET_NAME = get_env_variable('AWS_STORAGE_BUCKET_NAME', required=False)
        AWS_S3_ENDPOINT_URL = os.getenv('AWS_S3_ENDPOINT_URL')
        AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', 'us-east-1')
        AWS_S3_USE_SSL = os.getenv('AWS_S3_USE_SSL', 'True') == 'True'
        AWS_DEFAULT_ACL = os.getenv('AWS_DEFAULT_ACL', 'private')
        AWS_S3_FILE_OVERWRITE = os.getenv('AWS_S3_FILE_OVERWRITE', 'False') == 'True'
    except (ImportError, ImproperlyConfigured):
        # S3 storage not configured, use default file storage
        pass

# Celery Configuration
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/1')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/2')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = os.getenv('CELERY_TIMEZONE', 'UTC')
CELERY_ENABLE_UTC = os.getenv('CELERY_ENABLE_UTC', 'True') == 'True'

# Beat schedule utilities (keep import safe for test environments)
try:  # pragma: no cover
    from celery.schedules import crontab
except ImportError:  # pragma: no cover
    # Provide a minimal placeholder so settings import stays stable even when Celery
    # is not installed in the current environment. When Celery is available, the real
    # `crontab` is used.
    class _CrontabPlaceholder:
        def __init__(self, **kwargs):
            self.hour = kwargs.get("hour", None)
            self.minute = kwargs.get("minute", None)

        def __repr__(self) -> str:
            return f"crontab(hour={self.hour}, minute={self.minute})"

    def crontab(*_args, **kwargs):  # type: ignore[no-redef]
        return _CrontabPlaceholder(**kwargs)

# Celery Beat schedule (masters sync from Frankfurter and WorldTimeAPI)
CELERY_BEAT_SCHEDULE = {
    'sync-frankfurter-daily': {
        'task': 'saas_platform.masters.tasks.sync_currencies_and_rates_from_frankfurter_task',
        'schedule': 60 * 60 * 24,  # every 24 hours (seconds)
        'options': {'expires': 60 * 60},
    },
    'sync-worldtimeapi-weekly': {
        'task': 'saas_platform.masters.tasks.sync_timezones_from_worldtimeapi_task',
        'schedule': 60 * 60 * 24 * 7,  # every 7 days
        'options': {'expires': 60 * 60},
    },
    'run-invoice-schedules': {
      'task': 'tenant.billing.tasks.run_invoice_schedules',
      'schedule': crontab(hour=0, minute=0),
  }
}

# Frankfurter API (currencies + exchange rates)
FRANKFURTER_BASE_URL = os.getenv('FRANKFURTER_BASE_URL', 'https://api.frankfurter.dev')
FRANKFURTER_RATE_BASES = [
    b.strip() for b in os.getenv('FRANKFURTER_RATE_BASES', 'EUR').split(',')
    if b.strip()
]

# WorldTimeAPI (timezone list)
WORLDTIMEAPI_BASE_URL = os.getenv('WORLDTIMEAPI_BASE_URL', 'http://worldtimeapi.org/api')

# Email configuration
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'localhost')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_USE_SSL = os.getenv('EMAIL_USE_SSL', 'False') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('EMAIL_FROM', EMAIL_HOST_USER)

# Invite token configuration
INVITE_TOKEN_EXPIRATION_HOURS = int(os.getenv('INVITE_TOKEN_EXPIRATION_HOURS', '48'))

# Logging
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': LOG_LEVEL,
    },
}

# Error logging
ERROR_LOGGING_ENABLED = os.getenv('ERROR_LOGGING_ENABLED', 'True') == 'True'
ERROR_LOG_STACKTRACE_ENABLED = os.getenv('ERROR_LOG_STACKTRACE_ENABLED', 'False') == 'True'
ERROR_LOG_ENVIRONMENT = os.getenv('ERROR_LOG_ENVIRONMENT', os.getenv('ENVIRONMENT', 'local'))

# API Documentation
SPECTACULAR_SETTINGS = {
    'TITLE': 'Sports Academy Management System API',
    'DESCRIPTION': 'Multi-tenant SaaS platform for managing sports academies',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}
