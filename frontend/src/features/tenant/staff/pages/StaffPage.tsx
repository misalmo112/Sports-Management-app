/**
 * Staff (Coach) management page.
 * Coaches only: list, create, edit, delete coaches; salary; attendance view.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Edit, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingState } from '@/shared/components/common/LoadingState';
import {
  useCoaches,
  useCoach,
  useCreateCoach,
  useUpdateCoach,
  useDeleteCoach,
  useCoachPaySchemes,
  useCreateCoachPayScheme,
  useUpdateCoachPayScheme,
  useDeleteCoachPayScheme,
  useCreateCoachPayment,
  useStaffInvoices,
  useCreateStaffInvoice,
  useStaffReceipts,
} from '@/features/tenant/coaches/hooks/hooks';
import type {
  Coach,
  CreateCoachRequest,
  CoachPayScheme,
  CoachPaySchemePeriodType,
  PaymentMethod,
} from '@/features/tenant/coaches/services/api';
import { formatErrorMessage } from '@/shared/utils/errorUtils';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import { useCoachAttendance } from '@/features/tenant/attendance/hooks/hooks';

type Notice = { type: 'success' | 'error'; message: string };

const defaultCoachForm: CreateCoachRequest & { certifications?: string; bio?: string } = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  specialization: '',
  certifications: '',
  bio: '',
  is_active: true,
};

export const StaffPage = () => {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [activeTab, setActiveTab] = useState<'coaches' | 'salary' | 'invoices' | 'receipts' | 'attendance'>('coaches');
  const [coachModalOpen, setCoachModalOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [coachForm, setCoachForm] = useState(defaultCoachForm);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [salaryCoachFilter, setSalaryCoachFilter] = useState<string>('ALL');
  const [paySchemeModalOpen, setPaySchemeModalOpen] = useState(false);
  const [editingPayScheme, setEditingPayScheme] = useState<CoachPayScheme | null>(null);
  const [paySchemeForm, setPaySchemeForm] = useState({ coach: '', period_type: 'SESSION' as CoachPaySchemePeriodType, amount: '' });
  const [deletePaySchemeTarget, setDeletePaySchemeTarget] = useState<{ id: number; label: string } | null>(null);
  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const STAFF_INVOICE_NONE = '__none__';
  const [paymentForm, setPaymentForm] = useState({
    coach: '',
    period_type: 'SESSION' as CoachPaySchemePeriodType,
    period_start: new Date().toISOString().slice(0, 10),
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'CARD' as PaymentMethod,
    staff_invoice: STAFF_INVOICE_NONE,
    notes: '',
  });
  const [invoiceCoachFilter, setInvoiceCoachFilter] = useState<string>('ALL');
  const [invoiceForm, setInvoiceForm] = useState({
    coach: '',
    amount: '',
    period_description: '',
    period_type: 'MONTH' as CoachPaySchemePeriodType,
    period_start: new Date().toISOString().slice(0, 10),
    status: 'PENDING' as 'DRAFT' | 'PENDING' | 'PAID' | 'CANCELLED',
    due_date: '',
    notes: '',
  });
  const [receiptCoachFilter, setReceiptCoachFilter] = useState<string>('ALL');
  const [batchPaymentModalOpen, setBatchPaymentModalOpen] = useState(false);
  const [batchPaymentRows, setBatchPaymentRows] = useState<
    Array<{
      coach: string;
      period_type: CoachPaySchemePeriodType;
      period_start: string;
      amount: string;
      staff_invoice: string;
      notes: string;
    }>
  >([
    {
      coach: '',
      period_type: 'SESSION',
      period_start: new Date().toISOString().slice(0, 10),
      amount: '',
      staff_invoice: STAFF_INVOICE_NONE,
      notes: '',
    },
  ]);
  const [batchPaymentShared, setBatchPaymentShared] = useState({
    payment_method: 'CARD' as PaymentMethod,
    payment_date: new Date().toISOString().slice(0, 10),
  });
  const [batchPaymentSubmitting, setBatchPaymentSubmitting] = useState(false);
  const [batchPaymentProgress, setBatchPaymentProgress] = useState<{ current: number; total: number } | null>(null);
  const [attendanceCoachFilter, setAttendanceCoachFilter] = useState<string>('ALL');
  const [attendanceDateFilter, setAttendanceDateFilter] = useState<string>('');

  const navigate = useNavigate();
  const { data: coachesData, isLoading: coachesLoading, error: coachesError, refetch: refetchCoaches } = useCoaches({
    is_active: undefined,
  });
  const { data: coachDetail } = useCoach(editingCoach?.id);
  const createCoachMutation = useCreateCoach();
  const updateCoachMutation = useUpdateCoach();
  const deleteCoachMutation = useDeleteCoach();

  const { formatCurrency, currency } = useAcademyFormat();
  const { data: paySchemesData, isLoading: paySchemesLoading, refetch: refetchPaySchemes } = useCoachPaySchemes({
    coach: salaryCoachFilter === 'ALL' ? undefined : Number(salaryCoachFilter),
  });
  const createPaySchemeMutation = useCreateCoachPayScheme();
  const updatePaySchemeMutation = useUpdateCoachPayScheme();
  const deletePaySchemeMutation = useDeleteCoachPayScheme();

  const paySchemes = paySchemesData?.results ?? [];

  const createCoachPaymentMutation = useCreateCoachPayment();
  const { data: staffInvoicesData, isLoading: staffInvoicesLoading, refetch: refetchStaffInvoices } = useStaffInvoices({
    coach: invoiceCoachFilter === 'ALL' ? undefined : Number(invoiceCoachFilter),
    page_size: 200,
  });
  const createStaffInvoiceMutation = useCreateStaffInvoice();
  const { data: staffReceiptsData, isLoading: staffReceiptsLoading, refetch: refetchStaffReceipts } = useStaffReceipts({
    coach: receiptCoachFilter === 'ALL' ? undefined : Number(receiptCoachFilter),
    page_size: 200,
  });
  const staffInvoices = staffInvoicesData?.results ?? [];
  const staffReceipts = staffReceiptsData?.results ?? [];

  const coachIdForAttendance = attendanceCoachFilter && attendanceCoachFilter !== 'ALL' ? Number(attendanceCoachFilter) : NaN;
  const {
    data: coachAttendanceData,
    isLoading: coachAttendanceLoading,
    error: coachAttendanceError,
    refetch: refetchCoachAttendance,
  } = useCoachAttendance({
    coach: Number.isFinite(coachIdForAttendance) && coachIdForAttendance > 0 ? coachIdForAttendance : undefined,
    date: attendanceDateFilter || undefined,
    page_size: 100,
  });
  const coachAttendanceList = Array.isArray(coachAttendanceData?.results) ? coachAttendanceData.results : [];
  const presentCount = coachAttendanceList.filter((r) => r?.status === 'PRESENT').length;
  const absentCount = coachAttendanceList.filter((r) => r?.status === 'ABSENT').length;

  useEffect(() => {
    if (editingCoach && coachDetail && coachDetail.id === editingCoach.id) {
      setCoachForm({
        first_name: coachDetail.first_name,
        last_name: coachDetail.last_name,
        email: coachDetail.email,
        phone: coachDetail.phone ?? '',
        specialization: coachDetail.specialization ?? '',
        certifications: coachDetail.certifications ?? '',
        bio: coachDetail.bio ?? '',
        is_active: coachDetail.is_active,
      });
    }
  }, [editingCoach?.id, coachDetail]);

  const coaches = coachesData?.results ?? [];
  const hasError = coachesError;

  const refetchAll = () => {
    refetchCoaches();
    refetchPaySchemes();
    refetchStaffInvoices();
    refetchStaffReceipts();
    if (typeof refetchCoachAttendance === 'function') refetchCoachAttendance();
    setNotice(null);
  };

  const showSuccess = (message: string) => setNotice({ type: 'success', message });
  const showError = (message: string) => setNotice({ type: 'error', message });

  const openCreateCoach = () => {
    setEditingCoach(null);
    setCoachForm(defaultCoachForm);
    setCoachModalOpen(true);
  };

  const openEditCoach = (coach: Coach & { full_name?: string }) => {
    setEditingCoach(coach as Coach);
    const parts = (coach.full_name ?? '').split(' ');
    setCoachForm({
      first_name: coach.first_name ?? parts[0] ?? '',
      last_name: coach.last_name ?? parts.slice(1).join(' ') ?? '',
      email: coach.email,
      phone: coach.phone ?? '',
      specialization: coach.specialization ?? '',
      certifications: coach.certifications ?? '',
      bio: coach.bio ?? '',
      is_active: coach.is_active,
    });
    setCoachModalOpen(true);
  };

  const handleSaveCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCoach) {
      try {
        await updateCoachMutation.mutateAsync({
          id: editingCoach.id,
          data: {
            first_name: coachForm.first_name,
            last_name: coachForm.last_name,
            email: coachForm.email,
            phone: coachForm.phone || undefined,
            specialization: coachForm.specialization || undefined,
            certifications: coachForm.certifications || undefined,
            bio: coachForm.bio || undefined,
            is_active: coachForm.is_active,
          },
        });
        showSuccess('Coach updated successfully.');
        setCoachModalOpen(false);
        refetchCoaches();
      } catch (err) {
        showError(formatErrorMessage(err));
      }
    } else {
      try {
        await createCoachMutation.mutateAsync({
          first_name: coachForm.first_name,
          last_name: coachForm.last_name,
          email: coachForm.email,
          phone: coachForm.phone || undefined,
          specialization: coachForm.specialization || undefined,
          certifications: coachForm.certifications || undefined,
          bio: coachForm.bio || undefined,
          is_active: coachForm.is_active ?? true,
        });
        showSuccess('Coach created successfully.');
        setCoachModalOpen(false);
        refetchCoaches();
      } catch (err) {
        showError(formatErrorMessage(err));
      }
    }
  };

  const handleDeleteCoach = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCoachMutation.mutateAsync(deleteTarget.id);
      showSuccess('Coach deactivated successfully.');
      setDeleteTarget(null);
      refetchCoaches();
    } catch (err) {
      showError(formatErrorMessage(err));
    }
  };

  const openCreatePayScheme = () => {
    setEditingPayScheme(null);
    setPaySchemeForm({ coach: '', period_type: 'SESSION', amount: '' });
    setPaySchemeModalOpen(true);
  };

  const openEditPayScheme = (scheme: CoachPayScheme) => {
    setEditingPayScheme(scheme);
    setPaySchemeForm({
      coach: String(scheme.coach),
      period_type: scheme.period_type,
      amount: scheme.amount,
    });
    setPaySchemeModalOpen(true);
  };

  const handleSavePayScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    const coachId = Number(paySchemeForm.coach);
    const amountRaw = paySchemeForm.amount.trim();
    if (!coachId) {
      showError('Please select a coach.');
      return;
    }
    if (amountRaw === '') {
      showError('Please enter an amount.');
      return;
    }
    const amountNum = Number(amountRaw);
    if (Number.isNaN(amountNum) || amountNum < 0) {
      showError('Please enter a valid amount (zero or greater).');
      return;
    }
    const amount = String(amountNum);
    if (editingPayScheme) {
      try {
        await updatePaySchemeMutation.mutateAsync({
          id: editingPayScheme.id,
          data: { coach: coachId, period_type: paySchemeForm.period_type, amount },
        });
        showSuccess('Pay scheme updated.');
        setPaySchemeModalOpen(false);
        refetchPaySchemes();
      } catch (err) {
        showError(formatErrorMessage(err));
      }
    } else {
      try {
        await createPaySchemeMutation.mutateAsync({
          coach: coachId,
          period_type: paySchemeForm.period_type,
          amount,
        });
        showSuccess('Pay scheme created.');
        setPaySchemeModalOpen(false);
        refetchPaySchemes();
      } catch (err) {
        showError(formatErrorMessage(err));
      }
    }
  };

  const handleDeletePayScheme = async () => {
    if (!deletePaySchemeTarget) return;
    try {
      await deletePaySchemeMutation.mutateAsync(deletePaySchemeTarget.id);
      showSuccess('Pay scheme removed.');
      setDeletePaySchemeTarget(null);
      refetchPaySchemes();
    } catch (err) {
      showError(formatErrorMessage(err));
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const coachId = Number(paymentForm.coach);
    const amountNum = Number(paymentForm.amount);
    if (!coachId || Number.isNaN(amountNum) || amountNum <= 0) {
      showError('Select a coach and enter a valid amount.');
      return;
    }
    try {
      await createCoachPaymentMutation.mutateAsync({
        coach: coachId,
        period_type: paymentForm.period_type,
        period_start: paymentForm.period_start,
        amount: amountNum,
        payment_date: paymentForm.payment_date || undefined,
        payment_method: paymentForm.payment_method,
        staff_invoice: paymentForm.staff_invoice && paymentForm.staff_invoice !== STAFF_INVOICE_NONE ? Number(paymentForm.staff_invoice) : null,
        notes: paymentForm.notes || undefined,
      });
      showSuccess('Payment recorded. A receipt was created automatically.');
      setRecordPaymentModalOpen(false);
      setPaymentForm({
        coach: '',
        period_type: 'SESSION',
        period_start: new Date().toISOString().slice(0, 10),
        amount: '',
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: 'CARD',
        staff_invoice: STAFF_INVOICE_NONE,
        notes: '',
      });
      refetchStaffReceipts();
    } catch (err) {
      showError(formatErrorMessage(err));
    }
  };

  const handleCreateStaffInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const coachId = Number(invoiceForm.coach);
    const amountNum = Number(invoiceForm.amount);
    if (!coachId || Number.isNaN(amountNum) || amountNum < 0) {
      showError('Select a coach and enter a valid amount.');
      return;
    }
    if (!invoiceForm.period_description.trim()) {
      showError('Enter a period description.');
      return;
    }
    try {
      await createStaffInvoiceMutation.mutateAsync({
        coach: coachId,
        amount: amountNum,
        period_description: invoiceForm.period_description.trim(),
        period_type: invoiceForm.period_type,
        period_start: invoiceForm.period_start,
        status: invoiceForm.status,
        due_date: invoiceForm.due_date || null,
        notes: invoiceForm.notes || undefined,
      });
      showSuccess('Staff invoice created.');
      setInvoiceForm({
        coach: '',
        amount: '',
        period_description: '',
        period_type: 'MONTH',
        period_start: new Date().toISOString().slice(0, 10),
        status: 'PENDING',
        due_date: '',
        notes: '',
      });
      refetchStaffInvoices();
    } catch (err) {
      showError(formatErrorMessage(err));
    }
  };

  const handleBatchStaffPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = batchPaymentRows.filter(
      (r) => r.coach && Number(r.amount) > 0 && r.period_start
    );
    if (validRows.length === 0) {
      setNotice({ type: 'error', message: 'Add at least one row with coach, amount and period start.' });
      return;
    }
    setBatchPaymentSubmitting(true);
    setBatchPaymentProgress({ current: 0, total: validRows.length });
    const failed: { index: number; error: string }[] = [];
    let succeeded = 0;
    for (let i = 0; i < validRows.length; i++) {
      setBatchPaymentProgress({ current: i + 1, total: validRows.length });
      const row = validRows[i];
      try {
        await createCoachPaymentMutation.mutateAsync({
          coach: Number(row.coach),
          period_type: row.period_type,
          period_start: row.period_start,
          amount: Number(row.amount),
          payment_method: batchPaymentShared.payment_method,
          payment_date: batchPaymentShared.payment_date || undefined,
          staff_invoice: row.staff_invoice && row.staff_invoice !== STAFF_INVOICE_NONE ? Number(row.staff_invoice) : null,
          notes: row.notes?.trim() || undefined,
        });
        succeeded += 1;
      } catch (err) {
        failed.push({ index: i + 1, error: formatErrorMessage(err) });
      }
    }
    setBatchPaymentSubmitting(false);
    setBatchPaymentProgress(null);
    if (failed.length === 0) {
      setNotice({ type: 'success', message: `${succeeded} payment(s) recorded.` });
      setBatchPaymentModalOpen(false);
      setBatchPaymentRows([
        {
          coach: '',
          period_type: 'SESSION',
          period_start: new Date().toISOString().slice(0, 10),
          amount: '',
          staff_invoice: STAFF_INVOICE_NONE,
          notes: '',
        },
      ]);
      setBatchPaymentShared({ payment_method: 'CARD', payment_date: new Date().toISOString().slice(0, 10) });
      refetchStaffReceipts();
      refetchStaffInvoices();
    } else {
      setNotice({
        type: 'error',
        message: `${succeeded} of ${validRows.length} recorded. ${failed.map((f) => `Row ${f.index}: ${f.error}`).join('. ')}`,
      });
    }
  };

  return (
    <div className="container mx-auto space-y-6 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff</h1>
          <p className="mt-2 text-muted-foreground">
            Manage coaches, salary, and attendance.
          </p>
        </div>
        <Button variant="outline" onClick={refetchAll}>
          Refresh Data
        </Button>
      </div>

      {notice && (
        <Alert variant={notice.type === 'error' ? 'destructive' : 'default'}>
          {notice.type === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <AlertDescription>{notice.message}</AlertDescription>
        </Alert>
      )}

      {hasError && (
        <ErrorState
          error={hasError as Error}
          onRetry={refetchAll}
          title="Failed to load staff data"
        />
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="coaches">Coaches</TabsTrigger>
          <TabsTrigger value="salary">Salary</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="coaches" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Coaches</CardTitle>
                  <CardDescription>Create, edit, and manage coach accounts.</CardDescription>
                </div>
                <Button onClick={openCreateCoach}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Coach
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {coachesLoading ? (
                <LoadingState message="Loading coaches..." />
              ) : coaches.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Specialization</TableHead>
                        <TableHead>Classes</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coaches.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.full_name}</TableCell>
                          <TableCell>{c.email}</TableCell>
                          <TableCell>{c.phone || '-'}</TableCell>
                          <TableCell>{c.specialization || '-'}</TableCell>
                          <TableCell>{c.assigned_classes_count ?? 0}</TableCell>
                          <TableCell>
                            <Badge variant={c.is_active ? 'default' : 'secondary'}>
                              {c.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditCoach(c as Coach)}
                              >
                                <Edit className="mr-1 h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  setDeleteTarget({
                                    id: c.id,
                                    name: c.full_name,
                                  })
                                }
                                disabled={!c.is_active}
                              >
                                <Trash2 className="mr-1 h-4 w-4" />
                                Deactivate
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState
                  title="No coaches yet"
                  description="Add your first coach to get started."
                  actionLabel="Add Coach"
                  onAction={openCreateCoach}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Salary</CardTitle>
                  <CardDescription>Manage pay schemes per coach (per session, per month, per week).</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={openCreatePayScheme} disabled={coaches.length === 0}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Pay Scheme
                  </Button>
                  <Button variant="outline" onClick={() => setRecordPaymentModalOpen(true)} disabled={coaches.length === 0}>
                    Record Payment
                  </Button>
                  <Button variant="outline" onClick={() => setBatchPaymentModalOpen(true)} disabled={coaches.length === 0}>
                    Record multiple payments
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {coaches.length === 0 ? (
                <EmptyState
                  title="No coaches"
                  description="Add coaches first, then assign pay schemes."
                />
              ) : (
                <>
                  <div className="mb-4 flex items-center gap-2">
                    <Label>Filter by coach</Label>
                    <Select value={salaryCoachFilter} onValueChange={setSalaryCoachFilter}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All coaches</SelectItem>
                        {coaches.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {paySchemesLoading ? (
                    <LoadingState message="Loading pay schemes..." />
                  ) : paySchemes.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Coach</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paySchemes.map((ps) => (
                            <TableRow key={ps.id}>
                              <TableCell className="font-medium">{ps.coach_name}</TableCell>
                              <TableCell>{ps.period_type === 'SESSION' ? 'Per Session' : ps.period_type === 'MONTH' ? 'Per Month' : 'Per Week'}</TableCell>
                              <TableCell>{formatCurrency(ps.amount, currency)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" size="sm" onClick={() => openEditPayScheme(ps)}>
                                    <Edit className="mr-1 h-4 w-4" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() =>
                                      setDeletePaySchemeTarget({
                                        id: ps.id,
                                        label: `${ps.coach_name} - ${ps.period_type}`,
                                      })
                                    }
                                  >
                                    <Trash2 className="mr-1 h-4 w-4" />
                                    Delete
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <EmptyState
                      title="No pay schemes"
                      description="Add a pay scheme for a coach."
                      actionLabel="Add Pay Scheme"
                      onAction={openCreatePayScheme}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Staff Invoices</CardTitle>
              <CardDescription>Create invoices for coach payments. Link payments to invoices when recording payment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleCreateStaffInvoice} className="grid grid-cols-1 gap-3 md:grid-cols-6">
                <div className="md:col-span-2">
                  <Label>Coach</Label>
                  <Select value={invoiceForm.coach} onValueChange={(v) => setInvoiceForm((p) => ({ ...p, coach: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select coach" /></SelectTrigger>
                    <SelectContent>
                      {coaches.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input type="number" min="0" step="0.01" value={invoiceForm.amount} onChange={(e) => setInvoiceForm((p) => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <Label>Period</Label>
                  <Select value={invoiceForm.period_type} onValueChange={(v) => setInvoiceForm((p) => ({ ...p, period_type: v as CoachPaySchemePeriodType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SESSION">Per Session</SelectItem>
                      <SelectItem value="MONTH">Per Month</SelectItem>
                      <SelectItem value="WEEK">Per Week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Period start</Label>
                  <Input type="date" value={invoiceForm.period_start} onChange={(e) => setInvoiceForm((p) => ({ ...p, period_start: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <Label>Period description</Label>
                  <Input placeholder="e.g. January 2026" value={invoiceForm.period_description} onChange={(e) => setInvoiceForm((p) => ({ ...p, period_description: e.target.value }))} />
                </div>
                <div>
                  <Label>Due date</Label>
                  <Input type="date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm((p) => ({ ...p, due_date: e.target.value }))} />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={createStaffInvoiceMutation.isPending}>Create Invoice</Button>
                </div>
              </form>
              <div className="mb-2">
                <Label>Filter by coach</Label>
                <Select value={invoiceCoachFilter} onValueChange={setInvoiceCoachFilter}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All coaches</SelectItem>
                    {coaches.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {staffInvoicesLoading ? (
                <LoadingState message="Loading invoices..." />
              ) : staffInvoices.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Coach</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffInvoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                          <TableCell>{inv.coach_name}</TableCell>
                          <TableCell>{inv.period_description}</TableCell>
                          <TableCell>{formatCurrency(inv.amount, inv.currency)}</TableCell>
                          <TableCell><Badge variant={inv.status === 'PAID' ? 'default' : 'secondary'}>{inv.status}</Badge></TableCell>
                          <TableCell>{inv.due_date ?? '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState title="No staff invoices" description="Create an invoice for a coach payment period." />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Staff Receipts</CardTitle>
              <CardDescription>Payment receipts are created automatically when you record a coach payment.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label>Filter by coach</Label>
                <Select value={receiptCoachFilter} onValueChange={setReceiptCoachFilter}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All coaches</SelectItem>
                    {coaches.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {staffReceiptsLoading ? (
                <LoadingState message="Loading receipts..." />
              ) : staffReceipts.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receipt #</TableHead>
                        <TableHead>Coach</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffReceipts.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.receipt_number}</TableCell>
                          <TableCell>{r.coach_name}</TableCell>
                          <TableCell>{r.staff_invoice_detail?.invoice_number ?? '-'}</TableCell>
                          <TableCell>{formatCurrency(r.amount, currency)}</TableCell>
                          <TableCell>{r.payment_method}</TableCell>
                          <TableCell>{r.payment_date}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState title="No staff receipts" description="Receipts appear when you record a coach payment from the Salary tab." />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Coach Attendance</CardTitle>
                  <CardDescription>View coach attendance by coach and date.</CardDescription>
                </div>
                <Button variant="outline" onClick={() => navigate('/dashboard/attendance/coach')}>
                  Mark coach attendance
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {coaches.length === 0 ? (
                <EmptyState title="No coaches" description="Add coaches first to view attendance." />
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label>Coach</Label>
                      <Select value={attendanceCoachFilter} onValueChange={setAttendanceCoachFilter}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="All coaches" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All coaches</SelectItem>
                          {coaches.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={attendanceDateFilter}
                        onChange={(e) => setAttendanceDateFilter(e.target.value)}
                        className="w-[160px]"
                      />
                    </div>
                  </div>
                  {coachAttendanceError ? (
                    <ErrorState
                      error={coachAttendanceError as Error}
                      onRetry={() => typeof refetchCoachAttendance === 'function' && refetchCoachAttendance()}
                      title="Failed to load coach attendance"
                    />
                  ) : coachAttendanceLoading ? (
                    <LoadingState message="Loading attendance..." />
                  ) : coachAttendanceList.length > 0 ? (
                    <>
                      <div className="mb-4 flex gap-4">
                        <Badge variant="default">Present: {presentCount}</Badge>
                        <Badge variant="secondary">Absent: {absentCount}</Badge>
                      </div>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Class</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {coachAttendanceList.map((r) => (
                              <TableRow key={r?.id ?? Math.random()}>
                                <TableCell>{r?.date ?? '-'}</TableCell>
                                <TableCell>
                                  {'class_name' in r && typeof (r as { class_name?: string }).class_name === 'string'
                                    ? (r as { class_name: string }).class_name
                                    : r?.class_obj != null
                                      ? `Class #${r.class_obj}`
                                      : '-'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={r?.status === 'PRESENT' ? 'default' : 'secondary'}>
                                    {r?.status ?? '-'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate">{r?.notes || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  ) : (
                    <EmptyState
                      title="No attendance records"
                      description={
                        attendanceDateFilter
                          ? `No records for the selected coach on ${attendanceDateFilter}.`
                          : 'Select a coach or date to filter, or records will show for all.'
                      }
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Coach Dialog */}
      <Dialog open={coachModalOpen} onOpenChange={setCoachModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCoach ? 'Edit Coach' : 'Add Coach'}</DialogTitle>
            <DialogDescription>
              {editingCoach
                ? 'Update coach details below.'
                : 'Enter coach details. They can be invited to the app later.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCoach} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  value={coachForm.first_name}
                  onChange={(e) => setCoachForm((p) => ({ ...p, first_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  value={coachForm.last_name}
                  onChange={(e) => setCoachForm((p) => ({ ...p, last_name: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={coachForm.email}
                onChange={(e) => setCoachForm((p) => ({ ...p, email: e.target.value }))}
                required
                disabled={!!editingCoach}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={coachForm.phone}
                onChange={(e) => setCoachForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization / Role</Label>
              <Input
                id="specialization"
                value={coachForm.specialization}
                onChange={(e) => setCoachForm((p) => ({ ...p, specialization: e.target.value }))}
                placeholder="e.g. Head Coach, Assistant"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="certifications">Certifications</Label>
              <Textarea
                id="certifications"
                value={coachForm.certifications}
                onChange={(e) => setCoachForm((p) => ({ ...p, certifications: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={coachForm.bio}
                onChange={(e) => setCoachForm((p) => ({ ...p, bio: e.target.value }))}
                rows={2}
              />
            </div>
            {editingCoach && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={coachForm.is_active}
                  onChange={(e) => setCoachForm((p) => ({ ...p, is_active: e.target.checked }))}
                  className="h-4 w-4"
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCoachModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCoachMutation.isPending || updateCoachMutation.isPending}
              >
                {editingCoach ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete (Deactivate) confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate coach</DialogTitle>
            <DialogDescription>
              Deactivate {deleteTarget?.name}? They will no longer appear in active lists but records will be kept.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCoach}
              disabled={deleteCoachMutation.isPending}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Pay Scheme Dialog */}
      <Dialog open={paySchemeModalOpen} onOpenChange={setPaySchemeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPayScheme ? 'Edit Pay Scheme' : 'Add Pay Scheme'}</DialogTitle>
            <DialogDescription>
              Set pay rate per session, per month, or per week. One scheme per period type per coach.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavePayScheme} className="space-y-4">
            <div className="space-y-2">
              <Label>Coach</Label>
              <Select
                value={paySchemeForm.coach}
                onValueChange={(v) => setPaySchemeForm((p) => ({ ...p, coach: v }))}
                required
                disabled={!!editingPayScheme}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select coach" />
                </SelectTrigger>
                <SelectContent>
                  {coaches.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Period type</Label>
              <Select
                value={paySchemeForm.period_type}
                onValueChange={(v) => setPaySchemeForm((p) => ({ ...p, period_type: v as CoachPaySchemePeriodType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SESSION">Per Session</SelectItem>
                  <SelectItem value="MONTH">Per Month</SelectItem>
                  <SelectItem value="WEEK">Per Week</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount ({currency})</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={paySchemeForm.amount}
                onChange={(e) => setPaySchemeForm((p) => ({ ...p, amount: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaySchemeModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPaySchemeMutation.isPending || updatePaySchemeMutation.isPending}
              >
                {editingPayScheme ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Pay Scheme confirmation */}
      <Dialog open={!!deletePaySchemeTarget} onOpenChange={(open) => !open && setDeletePaySchemeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete pay scheme</DialogTitle>
            <DialogDescription>
              Remove pay scheme for {deletePaySchemeTarget?.label}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePaySchemeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePayScheme}
              disabled={deletePaySchemeMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment dialog */}
      <Dialog open={recordPaymentModalOpen} onOpenChange={setRecordPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record coach payment</DialogTitle>
            <DialogDescription>
              Record a payment to a coach. A receipt will be created automatically. Optionally link to a staff invoice.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="space-y-2">
              <Label>Coach</Label>
              <Select value={paymentForm.coach} onValueChange={(v) => setPaymentForm((p) => ({ ...p, coach: v }))}>
                <SelectTrigger><SelectValue placeholder="Select coach" /></SelectTrigger>
                <SelectContent>
                  {coaches.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period type</Label>
                <Select value={paymentForm.period_type} onValueChange={(v) => setPaymentForm((p) => ({ ...p, period_type: v as CoachPaySchemePeriodType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SESSION">Per Session</SelectItem>
                    <SelectItem value="MONTH">Per Month</SelectItem>
                    <SelectItem value="WEEK">Per Week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Period start</Label>
                <Input type="date" value={paymentForm.period_start} onChange={(e) => setPaymentForm((p) => ({ ...p, period_start: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Payment date</Label>
                <Input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm((p) => ({ ...p, payment_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm((p) => ({ ...p, payment_method: v as PaymentMethod }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Link to invoice (optional)</Label>
              <Select value={paymentForm.staff_invoice} onValueChange={(v) => setPaymentForm((p) => ({ ...p, staff_invoice: v }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={STAFF_INVOICE_NONE}>None</SelectItem>
                  {staffInvoices
                    .filter((inv) => !paymentForm.coach || inv.coach === Number(paymentForm.coach))
                    .map((inv) => (
                      <SelectItem key={inv.id} value={String(inv.id)}>
                        {inv.invoice_number} - {inv.coach_name} - {formatCurrency(inv.amount, inv.currency)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={paymentForm.notes} onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRecordPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCoachPaymentMutation.isPending}>
                Record payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record multiple payments dialog */}
      <Dialog open={batchPaymentModalOpen} onOpenChange={(open) => !open && setBatchPaymentModalOpen(false)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record multiple payments</DialogTitle>
            <DialogDescription>
              Record several coach payments at once. Shared payment method and date apply to all rows. A receipt is created for each.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBatchStaffPaymentSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label className="mb-1 block">Payment method (all rows)</Label>
                <Select
                  value={batchPaymentShared.payment_method}
                  onValueChange={(v) => setBatchPaymentShared((p) => ({ ...p, payment_method: v as PaymentMethod }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CHECK">Check</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block">Payment date (all rows)</Label>
                <Input
                  type="date"
                  value={batchPaymentShared.payment_date}
                  onChange={(e) => setBatchPaymentShared((p) => ({ ...p, payment_date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Payments</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setBatchPaymentRows((rows) => [
                      ...rows,
                      {
                        coach: '',
                        period_type: 'SESSION',
                        period_start: new Date().toISOString().slice(0, 10),
                        amount: '',
                        staff_invoice: STAFF_INVOICE_NONE,
                        notes: '',
                      },
                    ])
                  }
                >
                  <Plus className="mr-1 h-4 w-4" /> Add row
                </Button>
              </div>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coach</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Period start</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchPaymentRows.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Select
                            value={row.coach || '__none__'}
                            onValueChange={(v) =>
                              setBatchPaymentRows((rows) => {
                                const next = [...rows];
                                next[idx] = { ...next[idx], coach: v === '__none__' ? '' : v };
                                return next;
                              })
                            }
                          >
                            <SelectTrigger className="min-w-[120px]"><SelectValue placeholder="Coach" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Select coach</SelectItem>
                              {coaches.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.full_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.period_type}
                            onValueChange={(v) =>
                              setBatchPaymentRows((rows) => {
                                const next = [...rows];
                                next[idx] = { ...next[idx], period_type: v as CoachPaySchemePeriodType };
                                return next;
                              })
                            }
                          >
                            <SelectTrigger className="min-w-[100px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SESSION">Session</SelectItem>
                              <SelectItem value="MONTH">Month</SelectItem>
                              <SelectItem value="WEEK">Week</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            className="min-w-[120px]"
                            value={row.period_start}
                            onChange={(e) =>
                              setBatchPaymentRows((rows) => {
                                const next = [...rows];
                                next[idx] = { ...next[idx], period_start: e.target.value };
                                return next;
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            className="w-[90px]"
                            value={row.amount}
                            onChange={(e) =>
                              setBatchPaymentRows((rows) => {
                                const next = [...rows];
                                next[idx] = { ...next[idx], amount: e.target.value };
                                return next;
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.staff_invoice}
                            onValueChange={(v) =>
                              setBatchPaymentRows((rows) => {
                                const next = [...rows];
                                next[idx] = { ...next[idx], staff_invoice: v };
                                return next;
                              })
                            }
                          >
                            <SelectTrigger className="min-w-[100px]"><SelectValue placeholder="None" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={STAFF_INVOICE_NONE}>None</SelectItem>
                              {staffInvoices
                                .filter((inv) => !row.coach || inv.coach === Number(row.coach))
                                .map((inv) => (
                                  <SelectItem key={inv.id} value={String(inv.id)}>
                                    {inv.invoice_number}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Notes"
                            className="min-w-[80px]"
                            value={row.notes}
                            onChange={(e) =>
                              setBatchPaymentRows((rows) => {
                                const next = [...rows];
                                next[idx] = { ...next[idx], notes: e.target.value };
                                return next;
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {batchPaymentRows.length > 1 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setBatchPaymentRows((rows) => rows.filter((_, i) => i !== idx))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            {batchPaymentProgress && (
              <p className="text-sm text-muted-foreground">
                Recording {batchPaymentProgress.current} of {batchPaymentProgress.total}…
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBatchPaymentModalOpen(false)} disabled={batchPaymentSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={batchPaymentSubmitting}>
                {batchPaymentSubmitting ? 'Submitting…' : 'Submit all'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
