"""
Views for Tenant Reports API.
"""
import csv
import io
from datetime import date

from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from tenant.reports.services import ReportsService
from tenant.reports.serializers import (
    AcademyFinancialsReportSerializer,
    FinanceOverviewReportSerializer,
    ReportSerializer,
)
from shared.permissions.tenant import IsTenantAdmin


class ReportsView(APIView):
    """
    View for Tenant Reports (Admin/Owner only).
    
    Provides:
    - GET /api/v1/tenant/reports/ - Get reports
    
    Query parameters:
    - report_type: attendance, financial, enrollment, academy_financials, finance_overview
    - date_from: Start date (ISO format)
    - date_to: End date (ISO format)
    - class_id: Filter by class (optional)
    - student_id: Filter by student (optional, for attendance)
    - sport_id: Filter by sport (optional)
    - location_id: Filter by location (optional)
    """
    permission_classes = [IsTenantAdmin]
    
    def get(self, request):
        """Get report data."""
        if not hasattr(request, 'academy') or not request.academy:
            return Response(
                {'error': 'Academy context required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        report_type = request.query_params.get('report_type', 'attendance')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        class_id = request.query_params.get('class_id')
        student_id = request.query_params.get('student_id')
        sport_id = request.query_params.get('sport_id')
        location_id = request.query_params.get('location_id')
        coach_id = request.query_params.get('coach_id')
        
        # Parse dates if provided
        parsed_date_from = None
        parsed_date_to = None
        
        if date_from:
            try:
                parsed_date_from = date.fromisoformat(date_from)
            except (ValueError, AttributeError):
                pass
        
        if date_to:
            try:
                parsed_date_to = date.fromisoformat(date_to)
            except (ValueError, AttributeError):
                pass
        
        def parse_int(value):
            if value in [None, '']:
                return None
            try:
                return int(value)
            except (TypeError, ValueError):
                return None

        class_id_int = parse_int(class_id)
        student_id_int = parse_int(student_id)
        sport_id_int = parse_int(sport_id)
        location_id_int = parse_int(location_id)
        coach_id_int = parse_int(coach_id)

        serializer_class = ReportSerializer

        # Generate report based on type
        if report_type == 'attendance':
            report_data = ReportsService.get_attendance_report(
                academy=request.academy,
                date_from=parsed_date_from,
                date_to=parsed_date_to,
                class_id=class_id_int,
                student_id=student_id_int,
                sport_id=sport_id_int,
                location_id=location_id_int
            )
        elif report_type == 'financial':
            report_data = ReportsService.get_financial_report(
                academy=request.academy,
                date_from=parsed_date_from,
                date_to=parsed_date_to,
                sport_id=sport_id_int,
                location_id=location_id_int
            )
        elif report_type == 'enrollment':
            report_data = ReportsService.get_enrollment_report(
                academy=request.academy,
                class_id=class_id_int,
                sport_id=sport_id_int,
                location_id=location_id_int
            )
        elif report_type == 'academy_financials':
            report_data = ReportsService.get_academy_financials_report(
                academy=request.academy,
                date_from=parsed_date_from,
                date_to=parsed_date_to,
                location_id=location_id_int
            )
            serializer_class = AcademyFinancialsReportSerializer
        elif report_type == 'finance_overview':
            report_data = ReportsService.get_finance_overview_report(
                academy=request.academy,
                date_from=parsed_date_from,
                date_to=parsed_date_to,
                location_id=location_id_int,
                sport_id=sport_id_int,
                coach_id=coach_id_int,
            )
            serializer_class = FinanceOverviewReportSerializer
        else:
            return Response(
                {'error': f'Invalid report_type: {report_type}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = serializer_class(report_data)
        return Response(serializer.data)


class ReportsExportView(APIView):
    """
    Export report as CSV (e.g. finance_overview).
    GET /api/v1/tenant/reports/export/?report_type=finance_overview&format=csv&date_from=...&date_to=...
    """
    permission_classes = [IsTenantAdmin]

    def get(self, request):
        if not hasattr(request, 'academy') or not request.academy:
            return Response(
                {'error': 'Academy context required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        report_type = request.query_params.get('report_type')
        fmt = request.query_params.get('format', 'csv')
        if report_type != 'finance_overview' or fmt != 'csv':
            return Response(
                {'error': 'Only report_type=finance_overview and format=csv are supported'},
                status=status.HTTP_400_BAD_REQUEST
            )
        date_from_s = request.query_params.get('date_from')
        date_to_s = request.query_params.get('date_to')
        parsed_date_from = None
        parsed_date_to = None
        if date_from_s:
            try:
                parsed_date_from = date.fromisoformat(date_from_s)
            except (ValueError, AttributeError):
                pass
        if date_to_s:
            try:
                parsed_date_to = date.fromisoformat(date_to_s)
            except (ValueError, AttributeError):
                pass
        location_id = None
        sport_id = None
        coach_id = None
        for key, val in [('location_id', request.query_params.get('location_id')),
                         ('sport_id', request.query_params.get('sport_id')),
                         ('coach_id', request.query_params.get('coach_id'))]:
            if val not in (None, ''):
                try:
                    if key == 'location_id':
                        location_id = int(val)
                    elif key == 'sport_id':
                        sport_id = int(val)
                    else:
                        coach_id = int(val)
                except (TypeError, ValueError):
                    pass

        report_data = ReportsService.get_finance_overview_report(
            academy=request.academy,
            date_from=parsed_date_from,
            date_to=parsed_date_to,
            location_id=location_id,
            sport_id=sport_id,
            coach_id=coach_id,
        )
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(['Finance Overview', f'From {date_from_s or ""}', f'To {date_to_s or ""}'])
        writer.writerow([])
        writer.writerow(['Student Fees'])
        writer.writerow(['Total Invoiced', report_data['student']['summary'].get('total_amount', '')])
        writer.writerow(['Total Received', report_data['student']['summary'].get('total_collected', '')])
        writer.writerow(['Pending', report_data['student']['summary'].get('unpaid_amount', '')])
        writer.writerow(['Overdue Count', report_data['student']['summary'].get('overdue_count', '')])
        writer.writerow(['Overdue Amount', report_data['student']['summary'].get('overdue_amount', '')])
        writer.writerow([])
        writer.writerow(['Rent'])
        writer.writerow(['Invoiced', report_data['rent']['summary'].get('rent_invoiced', '')])
        writer.writerow(['Paid', report_data['rent']['summary'].get('rent_paid', '')])
        writer.writerow(['Unpaid', report_data['rent']['summary'].get('rent_unpaid', '')])
        writer.writerow(['Overdue Count', report_data['rent']['summary'].get('rent_overdue_count', '')])
        writer.writerow(['Overdue Amount', report_data['rent']['summary'].get('rent_overdue_amount', '')])
        writer.writerow([])
        writer.writerow(['Staff Fees'])
        writer.writerow(['Expected', report_data['staff']['summary'].get('expected_total', '')])
        writer.writerow(['Paid', report_data['staff']['summary'].get('paid_total', '')])
        writer.writerow(['Pending', report_data['staff']['summary'].get('pending_total', '')])
        writer.writerow([])
        writer.writerow(['Net Cash Position', report_data.get('net_cash_position', '')])
        if report_data.get('bills'):
            writer.writerow([])
            writer.writerow(['Bills'])
            writer.writerow(['Total', report_data['bills']['summary'].get('bills_total', '')])
            writer.writerow(['Paid', report_data['bills']['summary'].get('bills_paid_total', '')])
            writer.writerow(['Pending', report_data['bills']['summary'].get('bills_pending_total', '')])
            writer.writerow(['Overdue', report_data['bills']['summary'].get('bills_overdue_total', '')])
        csv_content = buffer.getvalue()
        response = HttpResponse(csv_content, content_type='text/csv')
        filename = f"finance_overview_{date_from_s or 'from'}_{date_to_s or 'to'}.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
