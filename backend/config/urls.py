"""
URL configuration for Sports Academy Management System.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def health_check(request):
    """Health check endpoint for Docker."""
    return JsonResponse({'status': 'healthy'})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health'),
    # Platform API URLs
    path('api/v1/platform/', include('saas_platform.tenants.urls')),
    path('api/v1/platform/', include('saas_platform.subscriptions.urls')),
    path('api/v1/platform/', include('saas_platform.finance.urls')),
    path('api/v1/platform/', include('saas_platform.analytics.urls')),
    path('api/v1/platform/', include('saas_platform.audit.urls')),
    path('api/v1/platform/', include('saas_platform.masters.urls')),
    # Tenant API URLs
    path('api/v1/tenant/', include('tenant.onboarding.urls')),
    path('api/v1/tenant/', include('tenant.overview.urls')),
    path('api/v1/tenant/', include('tenant.reports.urls')),
    path('api/v1/tenant/', include('tenant.communication.urls')),
    path('api/v1/tenant/', include('tenant.students.urls')),
    path('api/v1/tenant/', include('tenant.coaches.urls')),
    path('api/v1/tenant/', include('tenant.bulk_imports.urls')),
    path('api/v1/tenant/', include('tenant.classes.urls')),
    path('api/v1/tenant/', include('tenant.attendance.urls')),
    path('api/v1/tenant/', include('tenant.billing.urls')),
    path('api/v1/tenant/', include('tenant.facilities.urls')),
    path('api/v1/tenant/', include('tenant.media.urls')),
    path('api/v1/tenant/', include('tenant.masters.urls')),
    path('api/v1/tenant/', include('tenant.academy.urls')),
    path('api/v1/tenant/', include('tenant.portal.urls')),
    # Tenant audit log
    path('api/v1/tenant/', include('saas_platform.audit.tenant_urls')),

    # Tenant notifications (webhooks, resend, notification logs)
    path('api/v1/', include('tenant.notifications.urls')),
    # Tenant user management endpoints
    path('api/v1/tenant/', include('tenant.users.urls')),
    # Admin user management endpoints (legacy, kept for backward compatibility)
    path('api/v1/admin/', include('tenant.users.urls')),
    # Auth endpoints (separated to avoid router conflicts)
    path('api/v1/auth/', include('tenant.users.auth_urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
