# Platform Backend Implementation Summary

## Overview

This document summarizes the implementation of the platform backend for the Sports Academy Management System.

## Completed Components

### 1. Models
- **Plan** (`platform/subscriptions/models.py`): Subscription plan/tier definitions
- **Subscription** (`platform/subscriptions/models.py`): Academy subscriptions to plans
- **TenantQuota** (`platform/quotas/models.py`): Denormalized effective quota limits
- **TenantUsage** (`platform/quotas/models.py`): Real-time usage tracking
- **Academy** (`platform/tenants/models.py`): Core tenant entity
- **AuditLog** (`platform/audit/models.py`): Platform audit logging

### 2. Permissions
- **IsSuperadmin** (`shared/permissions/base.py`): Base superadmin permission
- **IsPlatformAdmin** (`shared/permissions/platform.py`): Platform admin permission

### 3. Serializers
- **Academy Serializers** (`platform/tenants/serializers.py`): Create, list, detail serializers
- **Plan/Quota Serializers** (`platform/tenants/serializers.py`): Plan and quota update serializers
- **Subscription Serializers** (`platform/subscriptions/serializers.py`): Subscription serializers
- **Quota Serializers** (`platform/quotas/serializers.py`): TenantQuota and TenantUsage serializers

### 4. Services
- **AcademyService** (`platform/tenants/services.py`): Academy business logic
- **QuotaService** (`platform/quotas/services.py`): Quota calculation and management

### 5. Signals
- **Subscription Signals** (`platform/subscriptions/signals.py`): Auto-update TenantQuota on subscription changes

### 6. Views/APIs
- **AcademyViewSet** (`platform/tenants/views.py`): 
  - POST `/api/v1/platform/academies/` - Create academy
  - GET `/api/v1/platform/academies/` - List academies
  - GET `/api/v1/platform/academies/{id}/` - Get academy details
  - PATCH `/api/v1/platform/academies/{id}/` - Update academy
  - PATCH `/api/v1/platform/academies/{id}/plan` - Update academy plan
  - PATCH `/api/v1/platform/academies/{id}/quota` - Update academy quota

### 7. URL Configuration
- Platform URLs configured in `config/urls.py` under `/api/v1/platform/`

### 8. Audit Logging
- **AuditService** (`platform/audit/services.py`): Central audit logging service
- Integrated with all platform operations (create, update, plan change, quota update)

### 9. Unit Tests
- Model tests for all models
- Permission tests
- API/ViewSet tests
- Service tests
- Audit logging tests

## Important Notes

### Django Settings Configuration

1. **Install Apps**: Make sure these apps are in `INSTALLED_APPS`:
   ```python
   INSTALLED_APPS = [
       # ... other apps
       'platform.subscriptions.apps.SubscriptionsConfig',  # Use AppConfig for signals
       'platform.quotas',
       'platform.tenants',
       'platform.audit',
       'shared.permissions',
   ]
   ```

2. **User Model**: The implementation assumes a User model with a `role` field. Make sure your User model has:
   - `role` field (CharField) with values like 'SUPERADMIN', 'ADMIN', etc.
   - Or update the permission classes to match your User model structure

3. **Dependencies**: Required packages:
   - `django-filter` (for filtering)
   - `djangorestframework` (for REST APIs)
   - PostgreSQL (for JSONField support)

### Signal Configuration

The subscription signals are automatically connected when using `SubscriptionsConfig` in INSTALLED_APPS. If you use `platform.subscriptions` directly, signals won't be connected. Make sure to use the AppConfig.

### Database Migrations

Run migrations to create the database tables:
```bash
python manage.py makemigrations
python manage.py migrate
```

### Testing

Run tests with:
```bash
python manage.py test platform.subscriptions
python manage.py test platform.quotas
python manage.py test platform.tenants
python manage.py test platform.audit
python manage.py test shared.permissions
```

## API Endpoints

All endpoints require superadmin authentication (IsPlatformAdmin permission).

### Academy Management
- `POST /api/v1/platform/academies/` - Create academy
- `GET /api/v1/platform/academies/` - List academies (with pagination, filtering, search)
- `GET /api/v1/platform/academies/{id}/` - Get academy details
- `PATCH /api/v1/platform/academies/{id}/` - Update academy
- `PATCH /api/v1/platform/academies/{id}/plan` - Update academy plan
- `PATCH /api/v1/platform/academies/{id}/quota` - Update academy quota

## Architecture Compliance

- ✅ Platform-only scope (no tenant business logic)
- ✅ Superadmin-only access for all platform APIs
- ✅ Audit logging for all platform operations
- ✅ Proper separation of concerns (models, services, views)
- ✅ Comprehensive unit tests
- ✅ RESTful API design

## Notification System (Email + WhatsApp)

This feature adds an automated invoice/receipt notification pipeline (Email via SendGrid + WhatsApp via WA Cloud API), including PDF generation and per-academy configuration/logging.

### New / Updated Backend Components
- **New Django app**: `tenant.notifications`
- **Platform model**: `AcademyWhatsAppConfig` (`saas_platform/tenants/models.py`)
- **Tenant model**: `NotificationLog` (`tenant/notifications/models.py`)
- **Invoice/Receipt document fields** (`tenant/billing/models.py`):
  - `Invoice.pdf_s3_key`, `Invoice.pdf_generated_at`
  - `Invoice.payment_link`, `Invoice.payment_link_expires_at`, `Invoice.gateway_reference`
  - `Receipt.pdf_s3_key`, `Receipt.pdf_generated_at`

### Core Utilities / Services
- **Encryption**: `shared/utils/encryption.py` (`encrypt_value`, `decrypt_value`) using `FERNET_SECRET_KEY`
- **Phone normalization**: `shared/utils/phone.py` (`normalize_to_e164`) for GCC/ARE formats
- **PDF generation**: `tenant/notifications/pdf_service.py` (`PDFService`)
  - Renders HTML templates via Django templates
  - Converts HTML -> PDF via WeasyPrint
  - Uploads PDFs to S3/MinIO and stores `pdf_s3_key` on Invoice/Receipt
  - Generates presigned URLs for email/WhatsApp
- **Email dispatch**: `tenant/notifications/email_service.py` (`EmailNotificationService`)
  - Sends branded invoice/receipt emails via SendGrid
  - Logs outcomes to `NotificationLog`
- **WhatsApp dispatch**: `tenant/notifications/whatsapp_service.py` (`WhatsAppNotificationService`)
  - Sends templated WA messages using per-academy encrypted credentials
  - Logs outcomes to `NotificationLog` (never logging decrypted access tokens)

### Celery Tasks
- `tenant.notifications.tasks.send_email_notification` (exponential backoff, up to 3 retries)
- `tenant.notifications.tasks.send_whatsapp_notification` (exponential backoff, up to 3 retries)
- `tenant.notifications.tasks.send_whatsapp_test_notification` (used by superadmin “test-send”)

### Signals and API Endpoints
- **Signals**: `tenant/notifications/signals.py`
  - Invoice status transition into `SENT` queues both email + WhatsApp notifications
  - Receipt creation queues both email + WhatsApp notifications
- **Webhook stub**: `POST /api/v1/webhooks/payments/`
- **Tenant resend endpoints**:
  - `POST /api/v1/tenant/invoices/{id}/resend-notifications/`
  - `POST /api/v1/tenant/receipts/{id}/resend-notifications/`
- **Tenant notification log queries**:
  - `GET /api/v1/tenant/invoices/{id}/notification-logs/`
  - `GET /api/v1/tenant/receipts/{id}/notification-logs/`
- **Superadmin platform endpoints**:
  - `GET /api/v1/platform/academies/{id}/whatsapp-config/`
  - `PUT /api/v1/platform/academies/{id}/whatsapp-config/`
  - `POST /api/v1/platform/academies/{id}/whatsapp-config/test-send/`
  - `GET /api/v1/platform/academies/{id}/notification-logs/`

### Database Migrations Added
- `tenant/notifications/migrations/0001_initial.py` (NotificationLog + initial app)
- `saas_platform/tenants/migrations/0008_academywhatsappconfig.py` (AcademyWhatsAppConfig)
- `tenant/billing/migrations/0005_invoice_gateway_reference_invoice_payment_link_and_more.py` (PDF + payment link fields)
