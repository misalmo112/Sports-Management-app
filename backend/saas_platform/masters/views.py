"""
Platform masters API: Currency and Timezone CRUD (Superadmin only).
"""
import logging
from django.db import DatabaseError, connection
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters

from saas_platform.masters.models import Currency, Timezone, Country
from saas_platform.masters.pagination import MastersListPagination
from saas_platform.masters.serializers import CurrencySerializer, TimezoneSerializer, CountrySerializer
from shared.permissions.platform import IsPlatformAdmin, IsPlatformAdminOrReadOnly

logger = logging.getLogger(__name__)


class CurrencyFilter(filters.FilterSet):
    is_active = filters.BooleanFilter()

    class Meta:
        model = Currency
        fields = ["is_active"]


class TimezoneFilter(filters.FilterSet):
    is_active = filters.BooleanFilter()

    class Meta:
        model = Timezone
        fields = ["is_active"]


class CountryFilter(filters.FilterSet):
    is_active = filters.BooleanFilter()

    class Meta:
        model = Country
        fields = ["is_active"]


class CurrencyViewSet(viewsets.ModelViewSet):
    """CRUD for platform currencies."""

    queryset = Currency.objects.all()
    permission_classes = [IsPlatformAdmin]
    serializer_class = CurrencySerializer
    pagination_class = MastersListPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = CurrencyFilter
    search_fields = ["code", "name"]
    ordering_fields = ["code", "name", "sort_order", "created_at"]
    ordering = ["sort_order", "code"]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        from saas_platform.tenants.models import Academy
        from saas_platform.subscriptions.models import Plan

        if Academy.objects.filter(currency=instance.code).exists():
            return Response(
                {
                    "detail": "Cannot delete currency in use by one or more academies. Deactivate it instead."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Plan.objects.filter(currency=instance.code).exists():
            return Response(
                {
                    "detail": "Cannot delete currency in use by one or more plans. Deactivate it instead."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class TimezoneViewSet(viewsets.ModelViewSet):
    """CRUD for platform timezones."""

    queryset = Timezone.objects.all()
    permission_classes = [IsPlatformAdmin]
    serializer_class = TimezoneSerializer
    pagination_class = MastersListPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TimezoneFilter
    search_fields = ["code", "name"]
    ordering_fields = ["code", "name", "sort_order", "created_at"]
    ordering = ["sort_order", "code"]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        from saas_platform.tenants.models import Academy

        if Academy.objects.filter(timezone=instance.code).exists():
            return Response(
                {
                    "detail": "Cannot delete timezone in use by one or more academies. Deactivate it instead."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class CountryViewSet(viewsets.ModelViewSet):
    """CRUD for platform countries. List/retrieve are global (any authenticated user); create/update/delete require platform admin."""

    queryset = Country.objects.all()
    permission_classes = [IsPlatformAdminOrReadOnly]
    serializer_class = CountrySerializer
    pagination_class = MastersListPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = CountryFilter
    search_fields = ["code", "name"]
    ordering_fields = ["code", "name", "sort_order", "created_at"]
    ordering = ["sort_order", "name"]

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except DatabaseError:
            logger.exception("CountryViewSet list failed; falling back to public schema query.")
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT code, name, phone_code, region, is_active, sort_order
                    FROM public.platform_countries
                    ORDER BY sort_order, name
                    """
                )
                rows = cursor.fetchall()
            items = [
                {
                    "code": code,
                    "name": name,
                    "phone_code": phone_code,
                    "region": region,
                    "is_active": is_active,
                    "sort_order": sort_order,
                }
                for code, name, phone_code, region, is_active, sort_order in rows
            ]
            return Response(
                {
                    "count": len(items),
                    "next": None,
                    "previous": None,
                    "results": items,
                }
            )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        from saas_platform.tenants.models import Academy

        if Academy.objects.filter(country=instance.code).exists():
            return Response(
                {
                    "detail": "Cannot delete country in use by one or more academies. Deactivate it instead."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)
