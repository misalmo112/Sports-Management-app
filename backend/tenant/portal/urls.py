from django.urls import path

from tenant.portal.views import (
    PortalInvoiceDetailView,
    PortalInvoiceListView,
    PortalInvoiceReceiptsView,
    PortalStudentMediaView,
    PortalStudentScheduleView,
    PortalPingView,
    PortalStudentDetailView,
    PortalStudentListView,
)


urlpatterns = [
    path("portal/ping/", PortalPingView.as_view(), name="portal-ping"),
    path("portal/students/", PortalStudentListView.as_view(), name="portal-student-list"),
    path("portal/students/<int:pk>/", PortalStudentDetailView.as_view(), name="portal-student-detail"),
    path(
        "portal/students/<int:student_id>/schedule/",
        PortalStudentScheduleView.as_view(),
        name="portal-student-schedule",
    ),
    path("portal/invoices/", PortalInvoiceListView.as_view(), name="portal-invoice-list"),
    path("portal/invoices/<int:pk>/", PortalInvoiceDetailView.as_view(), name="portal-invoice-detail"),
    path(
        "portal/invoices/<int:invoice_id>/receipts/",
        PortalInvoiceReceiptsView.as_view(),
        name="portal-invoice-receipts",
    ),
    path(
        "portal/students/<int:student_id>/media/",
        PortalStudentMediaView.as_view(),
        name="portal-student-media",
    ),
]
