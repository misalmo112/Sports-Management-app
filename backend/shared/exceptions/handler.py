import traceback
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    ValidationError,
    NotAuthenticated,
    PermissionDenied,
    NotFound,
    Throttled,
)
from saas_platform.audit.models import ErrorLog


def _get_request_id(request):
    if not request:
        return None
    return getattr(request, 'request_id', None) or request.META.get('HTTP_X_REQUEST_ID')


def _get_tenant_context(request):
    if not request:
        return {}
    academy = getattr(request, 'academy', None)
    if not academy:
        return {}
    return {
        'academy_id': str(academy.id),
        'academy_slug': getattr(academy, 'slug', None),
    }


def _map_error(exc, response):
    status_code = response.status_code if response else status.HTTP_500_INTERNAL_SERVER_ERROR
    
    if isinstance(exc, ValidationError):
        return 'VALIDATION_ERROR', 'Please check the highlighted fields.'
    if isinstance(exc, NotAuthenticated):
        return 'AUTHENTICATION_ERROR', 'Authentication required.'
    if isinstance(exc, PermissionDenied):
        return 'AUTHORIZATION_ERROR', 'You do not have permission to perform this action.'
    if isinstance(exc, NotFound):
        return 'NOT_FOUND', 'Resource not found.'
    if isinstance(exc, Throttled):
        return 'RATE_LIMIT', 'Too many requests. Please try again later.'
    
    if status_code in (status.HTTP_502_BAD_GATEWAY, status.HTTP_503_SERVICE_UNAVAILABLE, status.HTTP_504_GATEWAY_TIMEOUT):
        return 'DEPENDENCY_ERROR', 'Service temporarily unavailable. Please try again.'
    if status_code >= 500:
        return 'INTERNAL_ERROR', 'Something went wrong on our end. Please try again.'
    
    return 'ERROR', 'Request failed.'


def _build_details(response):
    if not response:
        return {}
    data = getattr(response, 'data', None)
    if data is None:
        detail = getattr(response, 'detail', None)
        if detail is not None:
            return {'detail': detail}
        return {}
    if isinstance(data, dict):
        return data
    return {'detail': data}


def _log_error(exc, request, code, message, response):
    if not getattr(settings, 'ERROR_LOGGING_ENABLED', False):
        return
    
    status_code = response.status_code if response else status.HTTP_500_INTERNAL_SERVER_ERROR
    # Accessing `request.user` can trigger authentication and may raise if the
    # auth header is missing (e.g. token obtain endpoints). Never let logging
    # crash the original error path.
    try:
        user = getattr(request, 'user', None) if request else None
    except Exception:
        user = None
    academy = getattr(request, 'academy', None) if request else None
    stacktrace = traceback.format_exc() if getattr(settings, 'ERROR_LOG_STACKTRACE_ENABLED', False) else None
    role = ''
    log_user = None
    if getattr(user, 'is_authenticated', False):
        role = getattr(user, 'role', None) or ''
        try:
            # In tenant schema requests, request.user can point to a user PK
            # that does not exist in the active schema's tenant_users table.
            UserModel = get_user_model()
            log_user = UserModel.objects.filter(pk=getattr(user, "pk", None)).first()
        except Exception:
            log_user = None
    
    try:
        ErrorLog.objects.create(
            request_id=_get_request_id(request),
            path=getattr(request, 'path', None),
            method=getattr(request, 'method', None),
            status_code=status_code,
            code=code,
            message=str(message),
            stacktrace=stacktrace,
            academy=academy,
            user=log_user,
            role=role,
            service='backend',
            environment=getattr(settings, 'ERROR_LOG_ENVIRONMENT', 'local'),
        )
    except Exception:
        # Avoid raising from error logger to prevent masking original errors.
        return


def api_exception_handler(exc, context):
    request = context.get('request') if context else None
    response = drf_exception_handler(exc, context)
    
    if response is None:
        response = drf_exception_handler(
            APIException('Internal error.'),
            context,
        )
        if response is None:
            from rest_framework.response import Response
            response = Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    
    code, message = _map_error(exc, response)
    details = _build_details(response)
    request_id = _get_request_id(request)
    
    payload = {
        'status': 'error',
        'code': code,
        'message': message,
        'details': details,
        'request_id': request_id,
        'tenant': _get_tenant_context(request),
        'timestamp': timezone.now().isoformat(),
    }
    
    if hasattr(response, 'data'):
        response.data = payload
    else:
        response = drf_exception_handler(APIException(message), context)
        response.data = payload
    
    _log_error(exc, request, code, message, response)
    return response
