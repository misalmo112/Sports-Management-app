from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from tenant.coaches.models import (
    Coach,
    CoachPayScheme,
    CoachPayment,
    StaffInvoice,
    StaffPaySchedule,
    StaffPayScheduleRun,
    StaffReceipt,
)
from tenant.coaches.serializers import (
    CoachSerializer,
    CoachListSerializer,
    CoachPaySchemeSerializer,
    CoachPaymentSerializer,
    PendingStaffInvoiceSerializer,
    StaffInvoiceSerializer,
    StaffPayScheduleRunSerializer,
    StaffPayScheduleSerializer,
    StaffReceiptSerializer,
)
from tenant.coaches.services import CoachesService
from tenant.coaches.tasks import (
    evaluate_monthly_pay_schedules,
    evaluate_session_pay_schedules,
    evaluate_weekly_pay_schedules,
)
from tenant.users.services import UserService
from tenant.users.serializers import UserSerializer
from tenant.users.permissions import CanCreateUsers
from shared.permissions.tenant import IsTenantAdmin
from shared.decorators.quota import check_quota
from shared.utils.queryset_filtering import filter_by_academy
from shared.services.quota import QuotaExceededError


class CoachViewSet(viewsets.ModelViewSet):
    """ViewSet for Coach model."""

    required_tenant_module = 'staff'
    
    queryset = Coach.objects.all()
    serializer_class = CoachSerializer
    permission_classes = [IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['first_name', 'last_name', 'email', 'phone', 'specialization']
    ordering_fields = ['first_name', 'last_name', 'email', 'created_at']
    ordering = ['last_name', 'first_name']
    
    def get_queryset(self):
        """Filter by academy."""
        queryset = super().get_queryset()
        return filter_by_academy(
            queryset,
            self.request.academy,
            self.request.user,
            self.request
        )
    
    def get_serializer_class(self):
        """Use list serializer for list action."""
        if self.action == 'list':
            return CoachListSerializer
        return CoachSerializer
    
    @check_quota('coaches')
    def create(self, request, *args, **kwargs):
        """Create coach with quota check."""
        return super().create(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'], permission_classes=[IsTenantAdmin, CanCreateUsers], url_path='invite')
    def invite(self, request, pk=None):
        """
        Create a User (role=COACH) for this staff coach, link them, and send invite email.
        POST /api/v1/tenant/coaches/{id}/invite/
        """
        coach = self.get_object()
        academy = getattr(request, 'academy', None)
        if not academy or coach.academy_id != academy.id:
            return Response(
                {'detail': 'Coach not found or does not belong to your academy.'},
                status=status.HTTP_404_NOT_FOUND
            )
        if coach.user_id is not None:
            return Response(
                {'detail': 'This coach already has a user account linked.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            user, token = UserService.create_user_with_invite_for_staff_coach(
                coach=coach,
                academy=academy,
                created_by=request.user,
            )
            UserService.send_invite_email_async(user, token)
            user_serializer = UserSerializer(user)
            return Response(
                {**user_serializer.data, 'invite_sent': True},
                status=status.HTTP_201_CREATED,
            )
        except DjangoValidationError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except QuotaExceededError as e:
            return Response(
                {
                    'detail': str(e),
                    'quota_type': getattr(e, 'quota_type', None),
                    'current_usage': getattr(e, 'current_usage', None),
                    'limit': getattr(e, 'limit', None),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
    
    def perform_destroy(self, instance):
        """Soft delete by setting is_active=False."""
        instance.is_active = False
        instance.save()


class CoachPaySchemeViewSet(viewsets.ModelViewSet):
    """ViewSet for CoachPayScheme model."""

    queryset = CoachPayScheme.objects.all()
    serializer_class = CoachPaySchemeSerializer
    permission_classes = [IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['coach', 'period_type']
    ordering_fields = ['coach', 'period_type', 'amount']
    ordering = ['coach', 'period_type']

    def get_queryset(self):
        """Filter by academy."""
        queryset = super().get_queryset()
        return filter_by_academy(
            queryset,
            self.request.academy,
            self.request.user,
            self.request,
        )


class CoachPaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for CoachPayment model. Create uses CoachesService to also create a StaffReceipt."""

    required_tenant_module = 'staff'

    queryset = CoachPayment.objects.all()
    serializer_class = CoachPaymentSerializer
    permission_classes = [IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['coach', 'period_type']
    ordering_fields = ['payment_date', 'coach', 'amount']
    ordering = ['-payment_date', '-created_at']

    def get_queryset(self):
        """Filter by academy."""
        queryset = super().get_queryset()
        return filter_by_academy(
            queryset,
            self.request.academy,
            self.request.user,
            self.request,
        )

    def create(self, request, *args, **kwargs):
        """Create coach payment and staff receipt via service."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        academy = getattr(request, 'academy', None)
        if not academy:
            return Response(
                {'detail': 'Academy context is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = serializer.validated_data
        try:
            payment, _receipt = CoachesService.create_coach_payment(
                academy=academy,
                coach=data['coach'],
                period_type=data['period_type'],
                period_start=data['period_start'],
                amount=data['amount'],
                payment_method=data.get('payment_method', 'OTHER'),
                payment_date=data.get('payment_date'),
                staff_invoice=data.get('staff_invoice'),
                notes=data.get('notes', ''),
            )
            response_serializer = CoachPaymentSerializer(payment)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except DjangoValidationError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class StaffInvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet for StaffInvoice model."""

    required_tenant_module = 'staff'

    queryset = StaffInvoice.objects.all()
    serializer_class = StaffInvoiceSerializer
    permission_classes = [IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['coach', 'status', 'issued_date', 'due_date']
    search_fields = ['invoice_number', 'period_description', 'notes']
    ordering_fields = ['issued_date', 'due_date', 'amount', 'created_at']
    ordering = ['-issued_date', '-created_at']

    def get_queryset(self):
        """Filter by academy."""
        return filter_by_academy(
            super().get_queryset(),
            self.request.academy,
            self.request.user,
            self.request,
        ).select_related('coach')

    def perform_create(self, serializer):
        """Set academy and generate invoice_number."""
        serializer.save(
            academy=self.request.academy,
            invoice_number=CoachesService.generate_staff_invoice_number(self.request.academy),
        )


class StaffReceiptViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only ViewSet for StaffReceipt (list/retrieve)."""

    required_tenant_module = 'staff'

    queryset = StaffReceipt.objects.all()
    serializer_class = StaffReceiptSerializer
    permission_classes = [IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['coach', 'payment_date', 'payment_method', 'staff_invoice']
    search_fields = ['receipt_number']
    ordering_fields = ['receipt_number', 'payment_date', 'amount', 'created_at']
    ordering = ['-payment_date', '-created_at']

    def get_queryset(self):
        """Filter by academy."""
        return filter_by_academy(
            super().get_queryset(),
            self.request.academy,
            self.request.user,
            self.request,
        ).select_related('coach', 'staff_invoice', 'coach_payment')


class StaffPayScheduleViewSet(viewsets.ModelViewSet):
    queryset = StaffPaySchedule.objects.all()
    serializer_class = StaffPayScheduleSerializer
    permission_classes = [IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['coach', 'billing_type', 'is_active']
    ordering_fields = ['created_at', 'updated_at', 'last_run_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return filter_by_academy(
            super().get_queryset(),
            self.request.academy,
            self.request.user,
            self.request,
        ).select_related('coach', 'class_scope')

    @action(detail=True, methods=['post'], url_path='run')
    def run(self, request, pk=None):
        schedule = self.get_object()
        evaluate_session_pay_schedules.delay(schedule_id=schedule.id)
        evaluate_monthly_pay_schedules.delay(schedule_id=schedule.id)
        evaluate_weekly_pay_schedules.delay(schedule_id=schedule.id)

        run = StaffPayScheduleRun.objects.create(
            schedule=schedule,
            invoices_created=0,
            status=StaffPayScheduleRun.RunStatus.SUCCEEDED,
            triggered_by=StaffPayScheduleRun.TriggerSource.MANUAL,
        )
        schedule.last_run_at = timezone.now()
        schedule.save(update_fields=['last_run_at', 'updated_at'])

        return Response(
            {
                'invoices_created': run.invoices_created,
                'status': run.status,
                'run_at': run.run_at,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        schedule = self.get_object()
        schedule.is_active = not schedule.is_active
        schedule.save(update_fields=['is_active', 'updated_at'])
        serializer = self.get_serializer(schedule)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='runs')
    def runs(self, request, pk=None):
        schedule = self.get_object()
        queryset = schedule.runs.all().order_by('-run_at')
        page = self.paginate_queryset(queryset)
        serializer = StaffPayScheduleRunSerializer(page if page is not None else queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class StaffPendingApprovalsView(ListAPIView):
    serializer_class = PendingStaffInvoiceSerializer
    permission_classes = [IsTenantAdmin]

    def get_queryset(self):
        qs = StaffInvoice.objects.filter(
            academy=self.request.academy,
            status=StaffInvoice.Status.DRAFT,
            schedule__isnull=False,
        ).select_related('coach', 'schedule')
        schedule_id = self.request.query_params.get('schedule_id')
        coach_id = self.request.query_params.get('coach_id')
        billing_type = self.request.query_params.get('billing_type')
        if schedule_id:
            qs = qs.filter(schedule_id=schedule_id)
        if coach_id:
            qs = qs.filter(coach_id=coach_id)
        if billing_type:
            qs = qs.filter(schedule__billing_type=billing_type)
        return qs.order_by('-created_at')


class StaffBulkIssueView(APIView):
    permission_classes = [IsTenantAdmin]

    def post(self, request, *args, **kwargs):
        invoice_ids = request.data.get('invoice_ids')
        if not isinstance(invoice_ids, list) or not invoice_ids:
            return Response({'detail': 'invoice_ids must be a non-empty list.'}, status=status.HTTP_400_BAD_REQUEST)

        invoices = StaffInvoice.objects.filter(id__in=invoice_ids)
        scoped_invoices = invoices.filter(academy=request.academy)
        if scoped_invoices.count() != len(set(invoice_ids)):
            return Response({'detail': 'One or more invoices were not found.'}, status=status.HTTP_404_NOT_FOUND)

        if scoped_invoices.filter(status=StaffInvoice.Status.PENDING).exists():
            return Response({'detail': 'One or more invoices are already PENDING.'}, status=status.HTTP_400_BAD_REQUEST)

        invalid = scoped_invoices.exclude(status=StaffInvoice.Status.DRAFT).exists() or scoped_invoices.filter(schedule__isnull=True).exists()
        if invalid:
            return Response(
                {'detail': 'All invoices must be DRAFT and schedule-generated.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        today = timezone.localdate()
        scoped_invoices.update(status=StaffInvoice.Status.PENDING, issued_date=today)
        return Response(
            {'issued_count': scoped_invoices.count(), 'invoice_ids': list(scoped_invoices.values_list('id', flat=True))},
            status=status.HTTP_200_OK,
        )
