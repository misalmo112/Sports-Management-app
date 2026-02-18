/**
 * Finance Overview Page
 * Summary KPIs, overdue alerts, student/rent/staff/bills sections, cash flow, date presets, export.
 */
import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { useReports } from '@/features/tenant/reports/hooks/useReports';
import { useLocations, useSports, useTerms } from '@/features/tenant/settings/hooks/hooks';
import { useCoaches } from '@/features/tenant/coaches/hooks/hooks';
import { exportReport } from '@/features/tenant/reports/services/reportsApi';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import type { FinanceOverviewReport } from '@/features/tenant/reports/types';
import {
  FileText,
  Building2,
  Users,
  ChevronDown,
  AlertTriangle,
  TrendingUp,
  Download,
  Receipt,
} from 'lucide-react';

function getThisWeek(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    from: monday.toISOString().slice(0, 10),
    to: sunday.toISOString().slice(0, 10),
  };
}

function getThisMonth(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function getLastMonth(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export const FinanceOverviewPage = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [locationFilter, setLocationFilter] = useState<number | undefined>(undefined);
  const [sportFilter, setSportFilter] = useState<number | undefined>(undefined);
  const [coachFilter, setCoachFilter] = useState<number | undefined>(undefined);
  const [exporting, setExporting] = useState(false);
  const { formatCurrency } = useAcademyFormat();

  const { data, isLoading, error, refetch } = useReports({
    report_type: 'finance_overview',
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    location_id: locationFilter,
    sport_id: sportFilter,
    coach_id: coachFilter,
  });

  const { data: locationsData } = useLocations({ page_size: 100 });
  const { data: sportsData } = useSports({ page_size: 100 });
  const { data: coachesData } = useCoaches({ page_size: 100 });
  const { data: termsData } = useTerms({ page_size: 100 });

  const applyPreset = useCallback((preset: 'this_week' | 'this_month' | 'last_month') => {
    const range =
      preset === 'this_week'
        ? getThisWeek()
        : preset === 'this_month'
          ? getThisMonth()
          : getLastMonth();
    setDateFrom(range.from);
    setDateTo(range.to);
  }, []);

  const applyTerm = useCallback((termId: string) => {
    if (termId === 'all' || !termId) return;
    const term = termsData?.results?.find((t) => String(t.id) === termId);
    if (term?.start_date && term?.end_date) {
      setDateFrom(term.start_date.slice(0, 10));
      setDateTo(term.end_date.slice(0, 10));
    }
  }, [termsData?.results]);

  const handleExportCsv = useCallback(async () => {
    setExporting(true);
    try {
      await exportReport({
        report_type: 'finance_overview',
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        location_id: locationFilter,
        sport_id: sportFilter,
        coach_id: coachFilter,
        format: 'csv',
      });
    } finally {
      setExporting(false);
    }
  }, [dateFrom, dateTo, locationFilter, sportFilter, coachFilter]);

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load finance overview"
        />
      </div>
    );
  }

  const report = data?.type === 'finance_overview' ? (data as FinanceOverviewReport) : null;
  const studentOverdue = report?.student?.summary?.overdue_count ?? 0;
  const studentOverdueAmount = report?.student?.summary?.overdue_amount ?? 0;
  const rentOverdue = report?.rent?.summary?.rent_overdue_count ?? 0;
  const rentOverdueAmount = report?.rent?.summary?.rent_overdue_amount ?? 0;
  const hasOverdue = studentOverdue > 0 || rentOverdue > 0;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Finance Overview</h1>
        <p className="text-muted-foreground mt-2">
          Summary KPIs, student fees, rent, staff fees, and cash flow — filter by date range
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Finance Overview</CardTitle>
          <CardDescription>
            All financial summary for the selected period. Use date filters and presets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters and presets */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap items-end gap-2 mb-2">
              <span className="text-sm font-medium text-muted-foreground mr-2">Presets:</span>
              <Button variant="outline" size="sm" onClick={() => applyPreset('this_week')}>
                This week
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyPreset('this_month')}>
                This month
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyPreset('last_month')}>
                Last month
              </Button>
              <Select onValueChange={applyTerm}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="This term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All / custom</SelectItem>
                  {termsData?.results?.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name} ({t.start_date?.slice(0, 10)} – {t.end_date?.slice(0, 10)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={exporting || !report}
                className="ml-4"
              >
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_from">Date From</Label>
                <Input
                  id="date_from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_to">Date To</Label>
                <Input
                  id="date_to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Select
                  value={locationFilter?.toString() ?? 'all'}
                  onValueChange={(v) =>
                    setLocationFilter(v === 'all' ? undefined : parseInt(v, 10))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {locationsData?.results?.map((loc) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sport</Label>
                <Select
                  value={sportFilter?.toString() ?? 'all'}
                  onValueChange={(v) =>
                    setSportFilter(v === 'all' ? undefined : parseInt(v, 10))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All sports" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sports</SelectItem>
                    {sportsData?.results?.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Coach (Staff)</Label>
                <Select
                  value={coachFilter?.toString() ?? 'all'}
                  onValueChange={(v) =>
                    setCoachFilter(v === 'all' ? undefined : parseInt(v, 10))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All coaches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All coaches</SelectItem>
                    {coachesData?.results?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <LoadingState message="Loading finance overview..." />
          ) : report ? (
            <>
              {/* Overdue alerts */}
              {hasOverdue && (
                <Alert variant="destructive" className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Overdue items</AlertTitle>
                  <AlertDescription>
                    {studentOverdue > 0 && (
                      <span>
                        {studentOverdue} student invoice(s) overdue ({formatCurrency(studentOverdueAmount)}).{' '}
                      </span>
                    )}
                    {rentOverdue > 0 && (
                      <span>
                        {rentOverdue} rent invoice(s) overdue ({formatCurrency(rentOverdueAmount)}).{' '}
                      </span>
                    )}
                    <Link to="/dashboard/finance/invoices" className="underline">
                      View invoices
                    </Link>
                    {' · '}
                    <Link to="/dashboard/management/facilities" className="underline">
                      Facilities
                    </Link>
                  </AlertDescription>
                </Alert>
              )}

              {/* Summary KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Student Fees
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-bold">{formatCurrency(report.student.summary.total_amount)}</p>
                    <p className="text-sm text-green-600">Received {formatCurrency(report.student.summary.paid_amount)}</p>
                    <p className="text-sm text-amber-600">Pending {formatCurrency(report.student.summary.unpaid_amount)}</p>
                    {(report.student.summary.overdue_count ?? 0) > 0 && (
                      <p className="text-sm text-destructive">
                        Overdue {report.student.summary.overdue_count} ({formatCurrency(report.student.summary.overdue_amount ?? 0)})
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Rent
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-bold">{formatCurrency(report.rent.summary.rent_invoiced)}</p>
                    <p className="text-sm text-green-600">Paid {formatCurrency(report.rent.summary.rent_paid)}</p>
                    <p className="text-sm text-amber-600">Pending {formatCurrency(report.rent.summary.rent_unpaid)}</p>
                    {(report.rent.summary.rent_overdue_count ?? 0) > 0 && (
                      <p className="text-sm text-destructive">
                        Overdue {report.rent.summary.rent_overdue_count} ({formatCurrency(report.rent.summary.rent_overdue_amount ?? 0)})
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Staff Fees
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-bold">{formatCurrency(report.staff.summary.expected_total)}</p>
                    <p className="text-sm text-green-600">Paid {formatCurrency(report.staff.summary.paid_total)}</p>
                    <p className="text-sm text-amber-600">Pending {formatCurrency(report.staff.summary.pending_total)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" /> Net cash (period)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p
                      className={`text-xl font-bold ${
                        (report.net_cash_position ?? 0) >= 0 ? 'text-green-600' : 'text-destructive'
                      }`}
                    >
                      {formatCurrency(report.net_cash_position ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Received − Rent − Staff − Bills</p>
                  </CardContent>
                </Card>
              </div>

              {/* Cash flow */}
              {report.cash_flow?.by_day && report.cash_flow.by_day.length > 0 && (
                <details className="group rounded-md border mb-4" open={false}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-4 py-3 font-semibold hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-0 group-[&:not([open])]:-rotate-90" />
                      <Receipt className="h-4 w-4" />
                      Cash flow (by day)
                    </span>
                  </summary>
                  <div className="border-t px-4 py-4">
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>In (receipts)</TableHead>
                            <TableHead>Out (rent)</TableHead>
                            <TableHead>Out (staff)</TableHead>
                            <TableHead>Out (bills)</TableHead>
                            <TableHead>Net</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.cash_flow.by_day.map((row) => (
                            <TableRow key={row.date}>
                              <TableCell>{row.date}</TableCell>
                              <TableCell>{formatCurrency(row.in_total)}</TableCell>
                              <TableCell>{formatCurrency(row.out_rent)}</TableCell>
                              <TableCell>{formatCurrency(row.out_staff)}</TableCell>
                              <TableCell>{formatCurrency(row.out_bills)}</TableCell>
                              <TableCell className={row.net >= 0 ? 'text-green-600' : 'text-destructive'}>
                                {formatCurrency(row.net)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </details>
              )}

              {/* Student fees - collapsible */}
              <details className="group rounded-md border mb-2" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-4 py-3 font-semibold hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-0 group-[&:not([open])]:-rotate-90" />
                    <FileText className="h-4 w-4" />
                    Student Fees
                  </span>
                  <span className="text-muted-foreground font-normal">
                    Invoiced {formatCurrency(report.student.summary.total_amount)} · Received{' '}
                    {formatCurrency(report.student.summary.paid_amount)}
                  </span>
                </summary>
                <div className="border-t px-4 py-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Summary</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/dashboard/finance/invoices">Invoices</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/dashboard/finance/receipts">Receipts</Link>
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-md border p-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Invoiced (Total)</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(report.student.summary.total_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Received (Paid)</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(report.student.summary.paid_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pending (Unpaid)</p>
                      <p className="text-xl font-bold text-amber-600">
                        {formatCurrency(report.student.summary.unpaid_amount)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {report.student.summary.total_invoices} invoices ·{' '}
                    {report.student.summary.total_receipts} receipts · Collected{' '}
                    {formatCurrency(report.student.summary.total_collected)} in period
                  </p>
                </div>
              </details>

              {/* Rent - collapsible */}
              <details className="group rounded-md border mb-2" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-4 py-3 font-semibold hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-0 group-[&:not([open])]:-rotate-90" />
                    <Building2 className="h-4 w-4" />
                    Rent
                  </span>
                  <span className="text-muted-foreground font-normal">
                    Invoiced {formatCurrency(report.rent.summary.rent_invoiced)} · Paid{' '}
                    {formatCurrency(report.rent.summary.rent_paid)}
                  </span>
                </summary>
                <div className="border-t px-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-md border p-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Invoiced</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(report.rent.summary.rent_invoiced)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Paid</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(report.rent.summary.rent_paid)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pending (Unpaid)</p>
                      <p className="text-xl font-bold text-amber-600">
                        {formatCurrency(report.rent.summary.rent_unpaid)}
                      </p>
                    </div>
                  </div>
                  {report.rent.rent_by_location?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Rent by Location</h4>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Location</TableHead>
                              <TableHead>Invoiced</TableHead>
                              <TableHead>Paid</TableHead>
                              <TableHead>Unpaid</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {report.rent.rent_by_location.map((row) => (
                              <TableRow key={row.location_id}>
                                <TableCell>{row.location_name}</TableCell>
                                <TableCell>{formatCurrency(row.invoiced)}</TableCell>
                                <TableCell>{formatCurrency(row.paid)}</TableCell>
                                <TableCell>{formatCurrency(row.unpaid)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              </details>

              {/* Staff fees - collapsible */}
              <details className="group rounded-md border mb-2" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-4 py-3 font-semibold hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-0 group-[&:not([open])]:-rotate-90" />
                    <Users className="h-4 w-4" />
                    Staff Fees
                  </span>
                  <span className="text-muted-foreground font-normal">
                    Expected {formatCurrency(report.staff.summary.expected_total)} · Paid{' '}
                    {formatCurrency(report.staff.summary.paid_total)}
                  </span>
                </summary>
                <div className="border-t px-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-md border p-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Expected</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(report.staff.summary.expected_total)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Paid</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(report.staff.summary.paid_total)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-xl font-bold text-amber-600">
                        {formatCurrency(report.staff.summary.pending_total)}
                      </p>
                    </div>
                  </div>
                  {report.staff.by_coach?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">By Coach</h4>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Coach</TableHead>
                              <TableHead>Expected</TableHead>
                              <TableHead>Paid</TableHead>
                              <TableHead>Pending</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {report.staff.by_coach.map((row) => (
                              <TableRow key={row.coach_id}>
                                <TableCell>{row.coach_name}</TableCell>
                                <TableCell>{formatCurrency(row.expected)}</TableCell>
                                <TableCell>{formatCurrency(row.paid)}</TableCell>
                                <TableCell>{formatCurrency(row.pending)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              </details>

              {/* Bills - collapsible */}
              {report.bills && (
                <details className="group rounded-md border mb-2" open={false}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-4 py-3 font-semibold hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-0 group-[&:not([open])]:-rotate-90" />
                      Bills (other costs)
                    </span>
                    <span className="text-muted-foreground font-normal">
                      Total {formatCurrency(report.bills.summary.bills_total)} · Paid{' '}
                      {formatCurrency(report.bills.summary.bills_paid_total)}
                    </span>
                  </summary>
                  <div className="border-t px-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 rounded-md border p-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-xl font-bold">{formatCurrency(report.bills.summary.bills_total)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Paid</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(report.bills.summary.bills_paid_total)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pending</p>
                        <p className="text-xl font-bold text-amber-600">
                          {formatCurrency(report.bills.summary.bills_pending_total)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Overdue</p>
                        <p className="text-xl font-bold text-destructive">
                          {formatCurrency(report.bills.summary.bills_overdue_total)}
                        </p>
                      </div>
                    </div>
                  </div>
                </details>
              )}
            </>
          ) : (
            <EmptyState
              title="No finance data"
              description="Select a date range and apply filters to see the finance overview."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
