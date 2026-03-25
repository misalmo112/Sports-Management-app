from rest_framework.response import Response
from rest_framework import generics
from rest_framework.views import APIView

from shared.permissions.portal import IsParentUser
from tenant.billing.models import Invoice, Receipt
from tenant.classes.models import Enrollment
from tenant.media.models import MediaFile
from tenant.portal.serializers import (
    PortalInvoiceDetailSerializer,
    PortalInvoiceSerializer,
    PortalMediaSerializer,
    PortalPingResponseSerializer,
    PortalReceiptSerializer,
    PortalScheduleSerializer,
    PortalStudentSerializer,
)
from tenant.students.models import Student


class PortalPingView(APIView):
    permission_classes = [IsParentUser]

    def get(self, request):
        parent = getattr(request, "guardian_parent", None)
        payload = {"status": "ok", "parent_id": parent.id}
        serializer = PortalPingResponseSerializer(payload)
        return Response(serializer.data)


class PortalStudentListView(generics.ListAPIView):
    permission_classes = [IsParentUser]
    serializer_class = PortalStudentSerializer

    def get_queryset(self):
        return Student.objects.filter(
            academy=self.request.academy,
            parent=self.request.guardian_parent,
        )


class PortalStudentDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsParentUser]
    serializer_class = PortalStudentSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return Student.objects.filter(
            academy=self.request.academy,
            parent=self.request.guardian_parent,
        )


class PortalStudentScheduleView(generics.ListAPIView):
    permission_classes = [IsParentUser]
    serializer_class = PortalScheduleSerializer

    def get_queryset(self):
        student = generics.get_object_or_404(
            Student.objects.only("id"),
            id=self.kwargs["student_id"],
            academy=self.request.academy,
            parent=self.request.guardian_parent,
        )
        return (
            Enrollment.objects.filter(
                academy=self.request.academy,
                student=student,
                status=Enrollment.Status.ENROLLED,
            )
            .select_related("class_obj", "class_obj__coach", "class_obj__sport", "class_obj__location")
            .order_by("class_obj__name")
        )


class PortalInvoiceListView(generics.ListAPIView):
    permission_classes = [IsParentUser]
    serializer_class = PortalInvoiceSerializer

    def get_queryset(self):
        queryset = Invoice.objects.filter(
            academy=self.request.academy,
            parent=self.request.guardian_parent,
        ).exclude(status__in=[Invoice.Status.DRAFT, Invoice.Status.CANCELLED])

        status_filter = self.request.query_params.get("status")
        if status_filter == "pending":
            queryset = queryset.filter(
                status__in=[
                    Invoice.Status.SENT,
                    Invoice.Status.OVERDUE,
                    Invoice.Status.PARTIALLY_PAID,
                ]
            )
        elif status_filter == "paid":
            queryset = queryset.filter(status=Invoice.Status.PAID)
        elif status_filter == "all":
            queryset = queryset

        return queryset.prefetch_related("receipts")


class PortalInvoiceDetailView(generics.RetrieveAPIView):
    permission_classes = [IsParentUser]
    serializer_class = PortalInvoiceDetailSerializer

    def get_queryset(self):
        return (
            Invoice.objects.filter(
                academy=self.request.academy,
                parent=self.request.guardian_parent,
            )
            .exclude(status__in=[Invoice.Status.DRAFT, Invoice.Status.CANCELLED])
            .prefetch_related("items", "receipts")
        )


class PortalInvoiceReceiptsView(generics.ListAPIView):
    permission_classes = [IsParentUser]
    serializer_class = PortalReceiptSerializer

    def get_queryset(self):
        invoice = generics.get_object_or_404(
            Invoice.objects.only("id"),
            id=self.kwargs["invoice_id"],
            academy=self.request.academy,
            parent=self.request.guardian_parent,
        )
        return Receipt.objects.filter(
            academy=self.request.academy,
            invoice=invoice,
        ).order_by("-payment_date", "-created_at")


class PortalStudentMediaView(generics.ListAPIView):
    permission_classes = [IsParentUser]
    serializer_class = PortalMediaSerializer

    def get_queryset(self):
        student = generics.get_object_or_404(
            Student.objects.only("id"),
            id=self.kwargs["student_id"],
            academy=self.request.academy,
            parent=self.request.guardian_parent,
        )
        queryset = (
            MediaFile.objects.filter(
                academy=self.request.academy,
                is_active=True,
                class_obj__enrollments__student=student,
                class_obj__enrollments__status=Enrollment.Status.ENROLLED,
            )
            .select_related("class_obj")
            .distinct()
            .order_by("-created_at")
        )

        class_id = self.request.query_params.get("class_id")
        if class_id:
            queryset = queryset.filter(class_obj_id=class_id)

        date_from = self.request.query_params.get("date_from")
        if date_from:
            queryset = queryset.filter(capture_date__gte=date_from)

        date_to = self.request.query_params.get("date_to")
        if date_to:
            queryset = queryset.filter(capture_date__lte=date_to)

        return queryset
