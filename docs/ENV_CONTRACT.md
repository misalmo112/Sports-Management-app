# Environment Variable Contract

## Overview

This document defines the complete environment variable contract for the Sports Academy Management System. All configuration values are provided via environment variables to ensure portability across development, staging, and production environments.

## Environment Variable Categories

### 1. Application Configuration

#### Core Application Settings

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `DEBUG` | Yes | `False` | Enable Django debug mode | `True` (dev), `False` (prod) |
| `SECRET_KEY` | Yes | - | Django secret key for cryptographic signing | `django-insecure-...` |
| `ALLOWED_HOSTS` | Yes | - | Comma-separated list of allowed hostnames | `localhost,127.0.0.1,api.example.com` |
| `CORS_ALLOWED_ORIGINS` | Yes | - | Comma-separated list of CORS allowed origins | `http://localhost:3000,https://app.example.com` |
| `TIME_ZONE` | No | `UTC` | Application timezone | `America/New_York` |
| `LANGUAGE_CODE` | No | `en-us` | Default language code | `en-us` |
| `USE_TZ` | No | `True` | Use timezone-aware datetimes | `True` |

| `PLATFORM_BASE_URL` | No | `http://localhost:8000` | Base URL used when building notification links | `https://app.example.com` |

#### Environment Identification

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `ENVIRONMENT` | Yes | - | Environment name (dev/staging/prod) | `development` |
| `APP_NAME` | No | `Sports Academy` | Application name | `Sports Academy` |
| `APP_VERSION` | No | `1.0.0` | Application version | `1.0.0` |

### 2. Database Configuration

#### PostgreSQL Settings

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `DATABASE_URL` | Yes* | - | Full database connection URL | `postgresql://user:pass@host:5432/dbname` |
| `DB_HOST` | Yes* | `localhost` | Database host | `localhost` or `127.0.0.1` |
| `DB_PORT` | No | `5432` | Database port | `5432` |
| `DB_NAME` | Yes* | - | Database name | `sports_academy_db` |
| `DB_USER` | Yes* | - | Database username | `postgres` |
| `DB_PASSWORD` | Yes* | - | Database password | `secure_password` |
| `DB_OPTIONS` | No | - | Additional database options (JSON) | `{"connect_timeout": 10}` |

**Note**: Either `DATABASE_URL` or all of `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` must be provided.

#### Database Connection Pooling

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `DB_CONN_MAX_AGE` | No | `600` | Connection max age in seconds | `600` |
| `DB_POOL_SIZE` | No | `10` | Connection pool size | `10` |

### 3. Redis Configuration

#### Redis Connection

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `REDIS_URL` | Yes* | - | Full Redis connection URL | `redis://localhost:6379/0` |
| `REDIS_HOST` | Yes* | `localhost` | Redis host | `localhost` or `127.0.0.1` |
| `REDIS_PORT` | No | `6379` | Redis port | `6379` |
| `REDIS_DB` | No | `0` | Redis database number | `0` |
| `REDIS_PASSWORD` | No | - | Redis password (if required) | `redis_password` |
| `REDIS_SSL` | No | `False` | Use SSL for Redis connection | `True` (prod) |

**Note**: Either `REDIS_URL` or `REDIS_HOST` must be provided.

### 4. JWT Authentication

#### JWT Configuration

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `JWT_SECRET_KEY` | Yes | - | Secret key for JWT signing | `jwt-secret-key-here` |
| `JWT_ALGORITHM` | No | `HS256` | JWT signing algorithm | `HS256` |
| `JWT_ACCESS_TOKEN_EXPIRATION` | No | `3600` | Access token expiration (seconds) | `3600` (1 hour) |
| `JWT_REFRESH_TOKEN_EXPIRATION` | No | `604800` | Refresh token expiration (seconds) | `604800` (7 days) |
| `JWT_ISSUER` | No | `sports-academy` | JWT issuer claim | `sports-academy` |
| `JWT_AUDIENCE` | No | `sports-academy-api` | JWT audience claim | `sports-academy-api` |

### 5. Storage Configuration

#### S3-Compatible Storage (MinIO / Cloud Storage)

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | Yes | - | S3 access key ID | Set in .env (MinIO dev default: minioadmin) |
| `AWS_SECRET_ACCESS_KEY` | Yes | - | S3 secret access key | Set in .env (MinIO dev default: minioadmin) |
| `AWS_STORAGE_BUCKET_NAME` | Yes | - | S3 bucket name | `sports-academy-media` |
| `AWS_S3_ENDPOINT_URL` | Yes | - | S3 endpoint URL | `http://localhost:9000` (MinIO) |
| `AWS_S3_REGION_NAME` | No | `us-east-1` | S3 region name | `us-east-1` |
| `AWS_S3_USE_SSL` | No | `True` | Use SSL for S3 connections | `True` (prod) |
| `AWS_S3_FILE_OVERWRITE` | No | `False` | Overwrite existing files | `False` |
| `AWS_DEFAULT_ACL` | No | `private` | Default ACL for uploaded files | `private` |
| `AWS_S3_MAX_MEMORY_SIZE` | No | `10485760` | Max memory size for uploads (bytes) | `10485760` (10MB) |

#### Google Cloud Storage (Production)

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `GOOGLE_CLOUD_STORAGE_BUCKET` | Yes (prod) | - | GCS bucket name | `sports-academy-media-prod` |
| `GOOGLE_CLOUD_STORAGE_PROJECT` | Yes (prod) | - | GCS project ID | `sports-academy-prod` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes (prod) | - | Path to GCS service account JSON | `/path/to/service-account.json` |

### 6. Google Cloud Configuration

#### Google Cloud Platform

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `GOOGLE_CLOUD_PROJECT` | Yes (prod) | - | GCP project ID | `sports-academy-prod` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes (prod) | - | Path to service account JSON | `/path/to/service-account.json` |
| `GOOGLE_CLOUD_REGION` | No | `us-central1` | GCP region | `us-central1` |

#### Cloud SQL (Production)

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `CLOUD_SQL_CONNECTION_NAME` | Yes (prod) | - | Cloud SQL connection name | `project:region:instance` |
| `CLOUD_SQL_PROXY_HOST` | No | `127.0.0.1` | Cloud SQL Proxy host | `127.0.0.1` |
| `CLOUD_SQL_PROXY_PORT` | No | `5432` | Cloud SQL Proxy port | `5432` |

#### Memorystore (Redis) (Production)

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `MEMORYSTORE_HOST` | Yes (prod) | - | Memorystore Redis host | `10.0.0.1` |
| `MEMORYSTORE_PORT` | No | `6379` | Memorystore Redis port | `6379` |

### 7. Celery Configuration

#### Celery Broker and Backend

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `CELERY_BROKER_URL` | Yes | - | Celery broker URL (Redis) | `redis://localhost:6379/1` |
| `CELERY_RESULT_BACKEND` | Yes | - | Celery result backend (Redis) | `redis://localhost:6379/2` |
| `CELERY_TASK_SERIALIZER` | No | `json` | Task serializer | `json` |
| `CELERY_RESULT_SERIALIZER` | No | `json` | Result serializer | `json` |
| `CELERY_ACCEPT_CONTENT` | No | `['json']` | Accepted content types | `['json']` |
| `CELERY_TIMEZONE` | No | `UTC` | Celery timezone | `UTC` |
| `CELERY_ENABLE_UTC` | No | `True` | Enable UTC | `True` |
| `CELERY_TASK_TRACK_STARTED` | No | `True` | Track task start | `True` |
| `CELERY_TASK_TIME_LIMIT` | No | `300` | Task time limit (seconds) | `300` |
| `CELERY_TASK_SOFT_TIME_LIMIT` | No | `240` | Task soft time limit (seconds) | `240` |
| `CELERY_WORKER_CONCURRENCY` | No | `2` | Celery worker process concurrency used by Docker Compose worker command | `2` |

#### Xero Integration

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `XERO_CLIENT_ID` | Yes (future Xero sync) | - | OAuth2 client ID for Xero | `your-xero-client-id` |
| `XERO_CLIENT_SECRET` | Yes (future Xero sync) | - | OAuth2 client secret for Xero | `your-xero-client-secret` |

#### Masters sync (Frankfurter and WorldTimeAPI)

Platform masters (currencies, timezones, exchange rates) can be synced from public APIs. No API keys required.

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `FRANKFURTER_BASE_URL` | No | `https://api.frankfurter.dev` | Frankfurter API base URL (currencies + exchange rates) | `https://api.frankfurter.dev` |
| `FRANKFURTER_RATE_BASES` | No | `EUR` | Comma-separated base currencies for latest rates | `EUR` or `EUR,USD` |
| `WORLDTIMEAPI_BASE_URL` | No | `http://worldtimeapi.org/api` | WorldTimeAPI base URL (timezone list) | `http://worldtimeapi.org/api` |

Sync runs via Celery Beat (daily for Frankfurter, weekly for WorldTimeAPI) or manually: `python manage.py sync_frankfurter`, `python manage.py sync_worldtimeapi`.

### 8. Email Configuration

#### SMTP Settings

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `EMAIL_BACKEND` | Yes | - | Email backend class | `django.core.mail.backends.smtp.EmailBackend` |
| `EMAIL_HOST` | Yes | - | SMTP host | `smtp.gmail.com` |
| `EMAIL_PORT` | No | `587` | SMTP port | `587` |
| `EMAIL_USE_TLS` | No | `True` | Use TLS | `True` |
| `EMAIL_USE_SSL` | No | `False` | Use SSL | `False` |
| `EMAIL_HOST_USER` | Yes | - | SMTP username | `noreply@example.com` |
| `EMAIL_HOST_PASSWORD` | Yes | - | SMTP password | `email_password` |
| `EMAIL_FROM` | No | - | Default from email | `noreply@example.com` |
| `EMAIL_SUBJECT_PREFIX` | No | `[Sports Academy]` | Email subject prefix | `[Sports Academy]` |

#### SendGrid (Invoice & Receipt Notifications)

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `SENDGRID_API_KEY` | Yes | - | SendGrid API key | `SG.xxxxx` |
| `SENDGRID_FROM_EMAIL` | No | `noreply@platform.com` | Sender email used for notification emails | `noreply@platform.com` |
| `SENDGRID_FROM_NAME` | No | `Sports Academy Platform` | Sender display name used for notification emails | `Sports Academy Platform` |

#### Google Cloud Email (Production)

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `GOOGLE_CLOUD_EMAIL_API_KEY` | No | - | GCP email API key | `api_key_here` |

#### Attendance Notifications

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `ATTENDANCE_NOTIFY_CHANNEL` | No | `disabled` | Celery channel for attendance notifications | `disabled` |

### 9. Logging Configuration

#### Logging Settings

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `LOG_LEVEL` | No | `INFO` | Logging level | `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `LOG_FORMAT` | No | `json` | Log format (json/text) | `json` |
| `LOG_FILE` | No | - | Log file path | `/var/log/app.log` |
| `SENTRY_DSN` | No | - | Sentry DSN for error tracking | `https://...@sentry.io/...` |
| `SENTRY_ENVIRONMENT` | No | - | Sentry environment | `production` |

### 10. Security Configuration

#### Security Settings

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `SECURE_SSL_REDIRECT` | No | `False` | Redirect HTTP to HTTPS | `True` (prod) |
| `SESSION_COOKIE_SECURE` | No | `False` | Secure session cookies | `True` (prod) |
| `CSRF_COOKIE_SECURE` | No | `False` | Secure CSRF cookies | `True` (prod) |
| `SECURE_HSTS_SECONDS` | No | `0` | HSTS max-age | `31536000` (prod) |
| `SECURE_HSTS_INCLUDE_SUBDOMAINS` | No | `False` | Include subdomains in HSTS | `True` (prod) |
| `SECURE_HSTS_PRELOAD` | No | `False` | Enable HSTS preload | `True` (prod) |
| `SECURE_CONTENT_TYPE_NOSNIFF` | No | `True` | X-Content-Type-Options | `True` |
| `SECURE_BROWSER_XSS_FILTER` | No | `True` | X-XSS-Protection | `True` |
| `X_FRAME_OPTIONS` | No | `DENY` | X-Frame-Options | `DENY` |
| `FERNET_SECRET_KEY` | Yes | - | Fernet base64-url-safe 32-byte key used to encrypt WhatsApp access tokens | `your-fernet-secret-key` |

### 11. API Configuration

#### API Settings

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `API_VERSION` | No | `v1` | API version | `v1` |
| `API_PAGE_SIZE` | No | `20` | Default page size | `20` |
| `API_MAX_PAGE_SIZE` | No | `100` | Maximum page size | `100` |
| `API_RATE_LIMIT` | No | `100` | Requests per hour | `100` |

### 12. Frontend Configuration

#### Frontend Environment Variables

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `VITE_API_BASE_URL` | Yes | - | API base URL | `http://localhost:8000/api/v1` |
| `VITE_APP_NAME` | No | `Sports Academy` | Application name | `Sports Academy` |
| `VITE_APP_VERSION` | No | `1.0.0` | Application version | `1.0.0` |
| `VITE_ENVIRONMENT` | Yes | - | Environment name | `development` |

## Environment-Specific Configurations

### Development Environment

```bash
# Application
DEBUG=True
SECRET_KEY=django-insecure-dev-key-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
ENVIRONMENT=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sports_academy_dev
# OR
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sports_academy_dev
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_URL=redis://localhost:6379/0
# OR
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# JWT
JWT_SECRET_KEY=jwt-dev-secret-key
JWT_ACCESS_TOKEN_EXPIRATION=3600
JWT_REFRESH_TOKEN_EXPIRATION=604800

# Storage (MinIO) - set real values in .env; never commit
AWS_ACCESS_KEY_ID=your_s3_access_key
AWS_SECRET_ACCESS_KEY=your_s3_secret_key
AWS_STORAGE_BUCKET_NAME=sports-academy-media-dev
AWS_S3_ENDPOINT_URL=http://localhost:9000
AWS_S3_USE_SSL=False

# Celery
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# Email (Development - Console Backend)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Logging
LOG_LEVEL=DEBUG
LOG_FORMAT=text
```

### Staging Environment

```bash
# Application
DEBUG=False
SECRET_KEY=<staging-secret-key>
ALLOWED_HOSTS=staging-api.example.com
CORS_ALLOWED_ORIGINS=https://staging-app.example.com
ENVIRONMENT=staging

# Database (Cloud SQL)
DATABASE_URL=postgresql://user:pass@/dbname?host=/cloudsql/project:region:instance
CLOUD_SQL_CONNECTION_NAME=project:region:instance

# Redis (Memorystore)
REDIS_URL=redis://10.0.0.1:6379/0
# OR
MEMORYSTORE_HOST=10.0.0.1
MEMORYSTORE_PORT=6379

# JWT
JWT_SECRET_KEY=<staging-jwt-secret>
JWT_ACCESS_TOKEN_EXPIRATION=3600
JWT_REFRESH_TOKEN_EXPIRATION=604800

# Storage (Google Cloud Storage)
GOOGLE_CLOUD_STORAGE_BUCKET=sports-academy-media-staging
GOOGLE_CLOUD_STORAGE_PROJECT=sports-academy-staging
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Celery
CELERY_BROKER_URL=redis://10.0.0.1:6379/1
CELERY_RESULT_BACKEND=redis://10.0.0.1:6379/2

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=noreply@example.com
EMAIL_HOST_PASSWORD=<email-password>

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=staging

# Security
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

### Production Environment

```bash
# Application
DEBUG=False
SECRET_KEY=<production-secret-key-from-secret-manager>
ALLOWED_HOSTS=api.example.com
CORS_ALLOWED_ORIGINS=https://app.example.com
ENVIRONMENT=production

# Database (Cloud SQL)
DATABASE_URL=postgresql://user:pass@/dbname?host=/cloudsql/project:region:instance
CLOUD_SQL_CONNECTION_NAME=project:region:instance

# Redis (Memorystore)
REDIS_URL=redis://10.0.0.1:6379/0
# OR
MEMORYSTORE_HOST=10.0.0.1
MEMORYSTORE_PORT=6379

# JWT
JWT_SECRET_KEY=<production-jwt-secret-from-secret-manager>
JWT_ACCESS_TOKEN_EXPIRATION=3600
JWT_REFRESH_TOKEN_EXPIRATION=604800

# Storage (Google Cloud Storage)
GOOGLE_CLOUD_STORAGE_BUCKET=sports-academy-media-prod
GOOGLE_CLOUD_STORAGE_PROJECT=sports-academy-prod
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Google Cloud
GOOGLE_CLOUD_PROJECT=sports-academy-prod
GOOGLE_CLOUD_REGION=us-central1

# Celery
CELERY_BROKER_URL=redis://10.0.0.1:6379/1
CELERY_RESULT_BACKEND=redis://10.0.0.1:6379/2

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=noreply@example.com
EMAIL_HOST_PASSWORD=<email-password-from-secret-manager>

# Logging
LOG_LEVEL=WARNING
LOG_FORMAT=json
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production

# Security
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
```

## Environment Variable Loading

### Django Settings Structure

```python
# config/settings/base.py
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Application
DEBUG = os.getenv('DEBUG', 'False') == 'True'
SECRET_KEY = os.getenv('SECRET_KEY')
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',')
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', '').split(',')

# Database
if os.getenv('DATABASE_URL'):
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.parse(os.getenv('DATABASE_URL'))
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '5432'),
            'NAME': os.getenv('DB_NAME'),
            'USER': os.getenv('DB_USER'),
            'PASSWORD': os.getenv('DB_PASSWORD'),
        }
    }

# Redis
if os.getenv('REDIS_URL'):
    REDIS_URL = os.getenv('REDIS_URL')
else:
    REDIS_URL = f"redis://{os.getenv('REDIS_HOST', 'localhost')}:{os.getenv('REDIS_PORT', '6379')}/{os.getenv('REDIS_DB', '0')}"

# JWT
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
JWT_ACCESS_TOKEN_EXPIRATION = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRATION', '3600'))
JWT_REFRESH_TOKEN_EXPIRATION = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRATION', '604800'))

# Storage
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME')
AWS_S3_ENDPOINT_URL = os.getenv('AWS_S3_ENDPOINT_URL')
AWS_S3_USE_SSL = os.getenv('AWS_S3_USE_SSL', 'True') == 'True'

# Celery
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', REDIS_URL.replace('/0', '/1'))
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', REDIS_URL.replace('/0', '/2'))

# Email
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'localhost')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
```

### Frontend Environment Variables

```typescript
// frontend/src/config/env.ts
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  appName: import.meta.env.VITE_APP_NAME || 'Sports Academy',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
  environment: import.meta.env.VITE_ENVIRONMENT || 'development',
};
```

## Secret Management

### Development

- Use `.env` file (not committed to version control)
- Use `.env.example` as template

### Staging/Production

- Use Google Cloud Secret Manager
- Store sensitive values in Secret Manager
- Reference secrets in Cloud Run environment variables
- Never commit secrets to version control

### Secret Manager Integration

```python
# config/settings/production.py
from google.cloud import secretmanager

def get_secret(secret_id):
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{os.getenv('GOOGLE_CLOUD_PROJECT')}/secrets/{secret_id}/versions/latest"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")

SECRET_KEY = get_secret('django-secret-key')
JWT_SECRET_KEY = get_secret('jwt-secret-key')
DB_PASSWORD = get_secret('db-password')
```

## Validation

### Environment Variable Validation

```python
# config/settings/validation.py
import os
from django.core.exceptions import ImproperlyConfigured

def get_required_env(key):
    """Get required environment variable or raise error."""
    value = os.getenv(key)
    if not value:
        raise ImproperlyConfigured(f"Required environment variable {key} is not set.")
    return value

def get_env_bool(key, default=False):
    """Get boolean environment variable."""
    value = os.getenv(key, str(default))
    return value.lower() in ('true', '1', 'yes', 'on')

def get_env_int(key, default=None):
    """Get integer environment variable."""
    value = os.getenv(key)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        raise ImproperlyConfigured(f"Environment variable {key} must be an integer.")
```

## Best Practices

1. **Never Commit Secrets**: Never commit `.env` files or secrets to version control
2. **Use .env.example**: Provide `.env.example` with placeholder values
3. **Validate Required Variables**: Validate all required variables at startup
4. **Use Secret Manager**: Use Google Cloud Secret Manager for production secrets
5. **Environment-Specific Files**: Use separate settings files for each environment
6. **Default Values**: Provide sensible defaults for non-critical variables
7. **Type Conversion**: Properly convert string environment variables to appropriate types
8. **Documentation**: Document all environment variables in this contract
9. **Validation**: Validate environment variables at application startup
10. **Error Messages**: Provide clear error messages for missing required variables

## Google Cloud Deployment

### Cloud Run Environment Variables

Set environment variables in Cloud Run service configuration:

```yaml
# cloud-run-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: sports-academy-api
spec:
  template:
    spec:
      containers:
      - image: gcr.io/project/sports-academy-api:latest
        env:
        - name: ENVIRONMENT
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-url
              key: url
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: django-secret-key
              key: secret
```

### Secret Manager Integration

1. Create secrets in Secret Manager
2. Grant Cloud Run service account access to secrets
3. Reference secrets in Cloud Run environment variables
4. Secrets are automatically injected at runtime

## Troubleshooting

### Common Issues

1. **Missing Required Variable**: Check error message for missing variable name
2. **Type Mismatch**: Ensure numeric variables are valid numbers
3. **Connection Issues**: Verify database/Redis URLs are correct
4. **Permission Issues**: Check service account permissions for Secret Manager
5. **CORS Issues**: Verify CORS_ALLOWED_ORIGINS includes frontend URL

### Debugging

Enable debug logging to see environment variable values (excluding secrets):

```python
import logging
logger = logging.getLogger(__name__)

# Log non-sensitive environment variables
logger.debug(f"Environment: {os.getenv('ENVIRONMENT')}")
logger.debug(f"Database Host: {os.getenv('DB_HOST')}")
# Never log secrets or passwords
```
