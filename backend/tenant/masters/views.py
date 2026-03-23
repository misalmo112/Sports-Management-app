"""
Master data endpoints (timezones, currencies, countries).
Read-only list from platform masters; tenant does not own this data.
"""
import logging
from django.db import DatabaseError, connection
from rest_framework.views import APIView
from rest_framework.response import Response
from shared.permissions.tenant import IsTenantAdmin
from saas_platform.masters.models import Country, Currency, Timezone

logger = logging.getLogger(__name__)


class TimezonesView(APIView):
    required_tenant_module = 'timezones'
    permission_classes = [IsTenantAdmin]

    def get(self, request):
        codes = list(
            Timezone.objects.filter(is_active=True)
            .order_by("sort_order", "code")
            .values_list("code", flat=True)
        )
        return Response({"timezones": codes})


class CurrenciesView(APIView):
    required_tenant_module = 'currencies'
    permission_classes = [IsTenantAdmin]

    def get(self, request):
        codes = list(
            Currency.objects.filter(is_active=True)
            .order_by("sort_order", "code")
            .values_list("code", flat=True)
        )
        return Response({"currencies": codes})


class CountriesView(APIView):
    required_tenant_module = 'organization-settings'
    permission_classes = [IsTenantAdmin]

    def get(self, request):
        try:
            countries = list(
                Country.objects.filter(is_active=True)
                .order_by("sort_order", "name")
                .values("code", "name")
            )
        except DatabaseError:
            logger.exception("Country ORM query failed; falling back to public schema query.")
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT code, name
                    FROM public.platform_countries
                    WHERE is_active = TRUE
                    ORDER BY sort_order, name
                    """
                )
                countries = [{"code": code, "name": name} for code, name in cursor.fetchall()]
        return Response({"countries": countries})
