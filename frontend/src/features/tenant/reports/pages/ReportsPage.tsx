/**
 * Reports Page
 * View academy reports
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { useReports } from '../hooks/useReports';
import { useLocations } from '@/features/tenant/settings/hooks/hooks';
import { useSports } from '@/features/tenant/settings/hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import type { ReportType } from '../types';

export const ReportsPage = () => {
  const [reportType, setReportType] = useState<ReportType>('attendance');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sportFilter, setSportFilter] = useState<number | undefined>(undefined);
  const [locationFilter, setLocationFilter] = useState<number | undefined>(undefined);
  const { formatCurrency } = useAcademyFormat();

  const { data, isLoading, error, refetch } = useReports({
    report_type: reportType,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    sport_id: reportType === 'academy_financials' ? undefined : sportFilter,
    location_id: locationFilter,
  });

  const { data: locationsData } = useLocations({ page_size: 100 });
  const { data: sportsData } = useSports({ page_size: 100 });

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-2">View academy reports</p>
      </div>

      {error && (
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load report"
          className="mb-6"
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>Academy reports and analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={(v) => {
                  setReportType(v as ReportType);
                  // Reset filters when report type changes
                  setSportFilter(undefined);
                  setLocationFilter(undefined);
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attendance">Attendance</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="enrollment">Enrollment</SelectItem>
                    <SelectItem value="academy_financials">Academy Financials</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            </div>
            <div className={`grid gap-4 ${reportType === 'academy_financials' ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {reportType !== 'academy_financials' && (
                <div className="space-y-2">
                  <Label>Sport</Label>
                  <Select
                    value={sportFilter?.toString() || 'all'}
                    onValueChange={(value) => {
                      setSportFilter(value === 'all' ? undefined : parseInt(value));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All sports" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sports</SelectItem>
                      {sportsData?.results.map((sport) => (
                        <SelectItem key={sport.id} value={sport.id.toString()}>
                          {sport.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Location</Label>
                <Select
                  value={locationFilter?.toString() || 'all'}
                  onValueChange={(value) => {
                    setLocationFilter(value === 'all' ? undefined : parseInt(value));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {locationsData?.results.map((location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <LoadingState message="Loading report data..." />
          ) : data ? (
            <div className="space-y-6">
              {data.type === 'attendance' && (
                <div>
                  <h3 className="font-semibold mb-4">Attendance Summary</h3>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Records</p>
                      <p className="text-2xl font-bold">{data.summary.total_records}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Present</p>
                      <p className="text-2xl font-bold text-green-600">{data.summary.present}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Absent</p>
                      <p className="text-2xl font-bold text-red-600">{data.summary.absent}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Attendance Rate</p>
                      <p className="text-2xl font-bold">{data.summary.attendance_rate}%</p>
                    </div>
                  </div>
                  {data.by_class && data.by_class.length > 0 && (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Class</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Present</TableHead>
                            <TableHead>Absent</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.by_class.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{item.class_obj__name}</TableCell>
                              <TableCell>{item.total}</TableCell>
                              <TableCell>{item.present}</TableCell>
                              <TableCell>{item.absent}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}

              {data.type === 'financial' && (
                <div>
                  <h3 className="font-semibold mb-4">Financial Summary</h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Invoices</p>
                      <p className="text-2xl font-bold">{data.summary.total_invoices}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(data.summary.total_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Paid Amount</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(data.summary.paid_amount)}
                      </p>
                    </div>
                  </div>
                  {data.invoices_by_status && data.invoices_by_status.length > 0 && (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Count</TableHead>
                            <TableHead>Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.invoices_by_status.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{item.status}</TableCell>
                              <TableCell>{item.count}</TableCell>
                              <TableCell>{formatCurrency(item.total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}

              {data.type === 'enrollment' && (
                <div>
                  <h3 className="font-semibold mb-4">Enrollment Summary</h3>
                  <p className="text-2xl font-bold mb-4">
                    Total Enrollments: {data.summary.total_enrollments}
                  </p>
                  {data.by_class && data.by_class.length > 0 && (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Class</TableHead>
                            <TableHead>Enrollments</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.by_class.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{item.class_obj__name}</TableCell>
                              <TableCell>{item.count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}

              {data.type === 'academy_financials' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-4">Academy Financials Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Running Cost (Invoiced Basis)</p>
                        <p className="text-2xl font-bold">{formatCurrency(data.summary.running_cost_invoiced_basis)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Running Cost (Cash Basis)</p>
                        <p className="text-2xl font-bold">{formatCurrency(data.summary.running_cost_paid_basis)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Net (Cash Basis)</p>
                        <p className={`text-2xl font-bold ${data.summary.net_cash_basis >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(data.summary.net_cash_basis)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="rounded-md border p-4">
                        <h4 className="font-medium mb-2">Rent</h4>
                        <p className="text-sm">Invoiced: {formatCurrency(data.summary.rent_invoiced)}</p>
                        <p className="text-sm">Paid: {formatCurrency(data.summary.rent_paid)}</p>
                        <p className="text-sm">Unpaid: {formatCurrency(data.summary.rent_unpaid)}</p>
                      </div>
                      <div className="rounded-md border p-4">
                        <h4 className="font-medium mb-2">Bills</h4>
                        <p className="text-sm">Total: {formatCurrency(data.summary.bills_total)}</p>
                        <p className="text-sm">Paid: {formatCurrency(data.summary.bills_paid_total)}</p>
                        <p className="text-sm">Pending: {formatCurrency(data.summary.bills_pending_total)}</p>
                        <p className="text-sm">Overdue: {formatCurrency(data.summary.bills_overdue_total)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="rounded-md border p-4">
                        <h4 className="font-medium mb-2">Revenue Reference</h4>
                        <p className="text-sm">Revenue Invoiced: {formatCurrency(data.summary.revenue_invoiced_total)}</p>
                        <p className="text-sm">Revenue Collected: {formatCurrency(data.summary.revenue_collected_total)}</p>
                        <p className="text-sm">Net (Invoiced Basis): {formatCurrency(data.summary.net_invoiced_basis)}</p>
                      </div>
                      <div className="rounded-md border p-4">
                        <h4 className="font-medium mb-2">Inventory Snapshot</h4>
                        <p className="text-sm">Items: {data.summary.inventory_item_count}</p>
                        <p className="text-sm">Total Quantity: {data.summary.inventory_total_quantity}</p>
                      </div>
                    </div>
                  </div>

                  {data.rent_by_location?.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Rent by Location</h4>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Location</TableHead>
                              <TableHead>Invoices</TableHead>
                              <TableHead>Invoiced</TableHead>
                              <TableHead>Paid</TableHead>
                              <TableHead>Unpaid</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.rent_by_location.map((row) => (
                              <TableRow key={row.location_id}>
                                <TableCell>{row.location_name}</TableCell>
                                <TableCell>{row.count}</TableCell>
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

                  {data.bills_by_status?.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Bills by Status</h4>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Status</TableHead>
                              <TableHead>Count</TableHead>
                              <TableHead>Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.bills_by_status.map((row, idx) => (
                              <TableRow key={`${row.status}-${idx}`}>
                                <TableCell>{row.status}</TableCell>
                                <TableCell>{row.count}</TableCell>
                                <TableCell>{formatCurrency(row.total)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              title="No report data available"
              description="Try adjusting your filters or date range to see report data."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
