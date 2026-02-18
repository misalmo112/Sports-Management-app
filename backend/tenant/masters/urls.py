"""
URLs for master data endpoints.
"""
from django.urls import path
from tenant.masters.views import TimezonesView, CurrenciesView

urlpatterns = [
    path('masters/timezones/', TimezonesView.as_view(), name='tenant-timezones'),
    path('masters/currencies/', CurrenciesView.as_view(), name='tenant-currencies'),
]
