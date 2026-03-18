"""
URL configuration for Platform Masters API.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from saas_platform.masters.views import CurrencyViewSet, TimezoneViewSet, CountryViewSet

router = DefaultRouter()
router.register(r"masters/currencies", CurrencyViewSet, basename="platform-currency")
router.register(r"masters/timezones", TimezoneViewSet, basename="platform-timezone")
router.register(r"masters/countries", CountryViewSet, basename="platform-country")

urlpatterns = [
    path("", include(router.urls)),
]
