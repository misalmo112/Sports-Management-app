"""
Master data endpoints (timezones and currencies).
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from shared.permissions.tenant import IsTenantAdmin
from tenant.masters.constants import CURRENCIES

try:
    from zoneinfo import available_timezones
except ImportError:  # pragma: no cover
    available_timezones = None


def _get_timezones():
    if available_timezones is not None:
        return sorted(available_timezones())
    try:
        import pytz
        return list(pytz.all_timezones)
    except Exception:
        return ["UTC"]


class TimezonesView(APIView):
    permission_classes = [IsTenantAdmin]

    def get(self, request):
        return Response({'timezones': _get_timezones()})


class CurrenciesView(APIView):
    permission_classes = [IsTenantAdmin]

    def get(self, request):
        return Response({'currencies': CURRENCIES})
