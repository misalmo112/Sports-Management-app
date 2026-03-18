"""
URLs for master data endpoints.
"""
from django.urls import path
from tenant.masters.views import TimezonesView, CurrenciesView, CountriesView

urlpatterns = [
    path('masters/timezones/', TimezonesView.as_view(), name='tenant-timezones'),
    path('masters/currencies/', CurrenciesView.as_view(), name='tenant-currencies'),
    path('masters/countries/', CountriesView.as_view(), name='tenant-countries'),
]
