"""
Tenant schema middleware.

Switches Postgres search_path to the academy schema for tenant requests.
Disabled by default; enable with TENANT_SCHEMA_ROUTING=true.
"""
import os
from django.db import connection
from django.utils.deprecation import MiddlewareMixin
from shared.tenancy.context import (
    set_current_schema,
    set_dual_write_disabled,
    clear_tenancy_context,
)
from shared.tenancy.schema import is_valid_schema_name


class TenantSchemaMiddleware(MiddlewareMixin):
    EXEMPT_PATHS = [
        '/api/v1/platform/',
        '/api/v1/auth/',
        '/api/v1/admin/',
        '/admin/',
        '/health/',
        '/static/',
        '/media/',
    ]

    def _is_enabled(self):
        return os.getenv('TENANT_SCHEMA_ROUTING', 'false').lower() == 'true'

    def process_request(self, request):
        if not self._is_enabled():
            return None
        if connection.vendor != 'postgresql':
            return None
        if any(request.path.startswith(path) for path in self.EXEMPT_PATHS):
            return None
        header_disable = request.META.get('HTTP_X_DUAL_WRITE_DISABLED', '')
        if header_disable.lower() in ('1', 'true', 'yes'):
            set_dual_write_disabled(True)
        else:
            set_dual_write_disabled(False)
        academy = getattr(request, 'academy', None)
        if not academy or not academy.schema_name:
            return None
        schema_name = academy.schema_name
        if not is_valid_schema_name(schema_name):
            return None

        with connection.cursor() as cursor:
            cursor.execute(
                f'SET search_path TO {connection.ops.quote_name(schema_name)}, public'
            )

        request._tenant_schema = schema_name
        set_current_schema(schema_name)
        return None

    def process_response(self, request, response):
        if not self._is_enabled():
            return response
        if connection.vendor != 'postgresql':
            return response
        if getattr(request, '_tenant_schema', None):
            with connection.cursor() as cursor:
                cursor.execute('SET search_path TO public')
        clear_tenancy_context()
        return response
