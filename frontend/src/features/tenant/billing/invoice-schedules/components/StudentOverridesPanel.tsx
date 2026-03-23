import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { Switch } from '@/shared/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { formatErrorMessage } from '@/shared/utils/errorUtils';
import { useStudents } from '@/features/tenant/students/hooks/hooks';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import { useCreateScheduleOverride, useScheduleOverrides, useUpdateScheduleOverride } from '../hooks/hooks';
import type {
  CreateStudentScheduleOverrideRequest,
  InvoiceScheduleBillingType,
  StudentScheduleOverride,
  StudentScheduleOverrideDiscountType,
  UpdateStudentScheduleOverrideRequest,
} from '../types';

type Notice = { type: 'success' | 'error'; message: string };

type OverrideDraft = {
  discount_type: StudentScheduleOverrideDiscountType;
  discount_value: string; // decimal as string
  reason: string;
  is_active: boolean;
  valid_from: string; // '' for null
  valid_until: string; // '' for null
};

type AddOverrideForm = {
  student?: number;
  discount_type: StudentScheduleOverrideDiscountType;
  discount_value: number | string;
  reason: string;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
};

type StudentOverridesPanelProps = {
  scheduleId: number;
  billingType?: InvoiceScheduleBillingType;
};

function normalizeOverrides(data: unknown): StudentScheduleOverride[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as StudentScheduleOverride[];
  const maybe = data as { results?: StudentScheduleOverride[] };
  return maybe.results ?? [];
}

export function StudentOverridesPanel({ scheduleId }: StudentOverridesPanelProps) {
  const { formatDateTime } = useAcademyFormat();
  const [notice, setNotice] = useState<Notice | null>(null);

  const [draftsByOverrideId, setDraftsByOverrideId] = useState<Record<number, OverrideDraft>>({});
  const [addForm, setAddForm] = useState<AddOverrideForm>({
    student: undefined,
    discount_type: 'PERCENTAGE',
    discount_value: 0,
    reason: '',
    is_active: true,
    valid_from: null,
    valid_until: null,
  });

  const { data: overridesData, isLoading: overridesLoading, error: overridesError, refetch: refetchOverrides } =
    useScheduleOverrides(scheduleId, true);

  const overrides = useMemo(() => normalizeOverrides(overridesData), [overridesData]);
  const overriddenStudentIds = useMemo(() => new Set(overrides.map((o) => o.student)), [overrides]);

  const { data: studentsData, isLoading: studentsLoading } = useStudents({
    is_active: true,
    // Make the picker show all students when search is empty.
    // `SearchableSelect` does client-side filtering.
    page_size: 1000,
  });

  const students = studentsData?.results ?? [];
  const studentOptions = useMemo(
    () =>
      students
        .filter((s) => !overriddenStudentIds.has(s.id))
        .map((s) => ({
          value: s.id.toString(),
          label: s.full_name,
        })),
    [students, overriddenStudentIds],
  );

  const { mutateAsync: createOverride, isPending: isCreatingOverride } = useCreateScheduleOverride();
  const { mutateAsync: updateOverride, isPending: isUpdatingOverride } = useUpdateScheduleOverride();

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    const next: Record<number, OverrideDraft> = {};
    for (const o of overrides) {
      next[o.id] = {
        discount_type: o.discount_type,
        discount_value: o.discount_value ?? '0',
        reason: o.reason ?? '',
        is_active: o.is_active,
        valid_from: o.valid_from ?? '',
        valid_until: o.valid_until ?? '',
      };
    }
    setDraftsByOverrideId(next);
  }, [overrides]);

  const canSubmitAdd = !!addForm.student && addForm.reason.trim().length > 0;

  const handleDraftChange = (overrideId: number, patch: Partial<OverrideDraft>) => {
    setDraftsByOverrideId((prev) => ({
      ...prev,
      [overrideId]: { ...prev[overrideId], ...patch },
    }));
  };

  const handleSaveOverride = async (override: StudentScheduleOverride) => {
    const draft = draftsByOverrideId[override.id];
    if (!draft) return;
    try {
      const payload: UpdateStudentScheduleOverrideRequest = {
        discount_type: draft.discount_type,
        discount_value: Number(draft.discount_value),
        reason: draft.reason,
        is_active: draft.is_active,
        valid_from: draft.valid_from ? draft.valid_from : null,
        valid_until: draft.valid_until ? draft.valid_until : null,
      };
      await updateOverride({ scheduleId, overrideId: override.id, data: payload });
      setNotice({ type: 'success', message: `Override updated for ${students.find((s) => s.id === override.student)?.full_name || `Student #${override.student}`}.` });
    } catch (err) {
      setNotice({ type: 'error', message: formatErrorMessage(err) });
    }
  };

  const handleAddOverride = async () => {
    if (!canSubmitAdd) {
      setNotice({ type: 'error', message: 'Select a student and provide a reason.' });
      return;
    }
    try {
      const payload: CreateStudentScheduleOverrideRequest = {
        student: addForm.student as number,
        discount_type: addForm.discount_type,
        discount_value: addForm.discount_value,
        reason: addForm.reason,
        is_active: addForm.is_active ?? true,
        valid_from: addForm.valid_from ?? null,
        valid_until: addForm.valid_until ?? null,
      };

      await createOverride({ scheduleId, data: payload });
      setAddForm({
        student: undefined,
        discount_type: 'PERCENTAGE',
        discount_value: 0,
        reason: '',
        is_active: true,
        valid_from: null,
        valid_until: null,
      });
      setNotice({ type: 'success', message: 'Override created.' });
    } catch (err) {
      setNotice({ type: 'error', message: formatErrorMessage(err) });
    }
  };

  return (
    <div className="space-y-4">
      {notice ? (
        <Alert variant={notice.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{notice.message}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student Overrides</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Override discount settings for specific students on this schedule.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {overridesLoading ? <LoadingState message="Loading overrides..." /> : null}
          {overridesError ? (
            <ErrorState
              error={overridesError}
              onRetry={() => refetchOverrides()}
              title="Failed to load overrides"
            />
          ) : null}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Discount Type</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Valid From</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground">
                      No student overrides yet. Use the form below to add one.
                    </TableCell>
                  </TableRow>
                ) : (
                  overrides.map((o) => {
                    const draft = draftsByOverrideId[o.id];
                    const studentName = students.find((s) => s.id === o.student)?.full_name;
                    return (
                      <TableRow key={o.id}>
                        <TableCell>
                          <div className="font-medium">{studentName || `Student #${o.student}`}</div>
                          {o.valid_from || o.valid_until ? (
                            <div className="text-xs text-muted-foreground">
                              {o.valid_from ? formatDateTime(o.valid_from) : '—'} →{' '}
                              {o.valid_until ? formatDateTime(o.valid_until) : '—'}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`override-active-${o.id}`}
                              checked={draft?.is_active ?? o.is_active}
                              onCheckedChange={(checked) => handleDraftChange(o.id, { is_active: checked })}
                              disabled={isUpdatingOverride}
                            />
                            <Badge variant={draft?.is_active ? 'success' : 'secondary'}>
                              {draft?.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={draft?.discount_type ?? o.discount_type}
                            onValueChange={(v) => handleDraftChange(o.id, { discount_type: v as StudentScheduleOverrideDiscountType })}
                            disabled={isUpdatingOverride}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select discount type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                              <SelectItem value="FIXED">Fixed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="w-28 ml-auto"
                            value={draft?.discount_value ?? o.discount_value}
                            onChange={(e) => handleDraftChange(o.id, { discount_value: e.target.value })}
                            disabled={isUpdatingOverride}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={draft?.reason ?? o.reason}
                            onChange={(e) => handleDraftChange(o.id, { reason: e.target.value })}
                            disabled={isUpdatingOverride}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={draft?.valid_from ?? o.valid_from ?? ''}
                            onChange={(e) => handleDraftChange(o.id, { valid_from: e.target.value })}
                            disabled={isUpdatingOverride}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={draft?.valid_until ?? o.valid_until ?? ''}
                            onChange={(e) => handleDraftChange(o.id, { valid_until: e.target.value })}
                            disabled={isUpdatingOverride}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveOverride(o)}
                            disabled={isUpdatingOverride}
                          >
                            Save
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-md border p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2 flex-1">
                <Label htmlFor="add-student">Add Override</Label>
                <p className="text-sm text-muted-foreground">
                  Create a new discount override for an individual student.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="add-student">Student</Label>
                    <SearchableSelect
                      id="add-student"
                      options={studentOptions}
                      value={addForm.student ? addForm.student.toString() : '__none__'}
                      onValueChange={(v) => {
                        const next = v === '__none__' ? undefined : Number(v);
                        setAddForm((prev) => ({ ...prev, student: next }));
                      }}
                      placeholder={studentsLoading ? 'Loading students...' : 'Select student'}
                      disabled={studentsLoading || isCreatingOverride}
                      allowEmpty
                      emptyOptionLabel="Select student"
                      searchPlaceholder="Search students..."
                      emptyMessage="No students match your search."
                      isLoading={studentsLoading}
                      loadingMessage="Loading students..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="add-discount-type">Discount Type</Label>
                    <Select
                      value={addForm.discount_type}
                      onValueChange={(v) => setAddForm((prev) => ({ ...prev, discount_type: v as StudentScheduleOverrideDiscountType }))}
                      disabled={isCreatingOverride}
                    >
                      <SelectTrigger id="add-discount-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                        <SelectItem value="FIXED">Fixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="add-discount-value">Discount Value</Label>
                    <Input
                      id="add-discount-value"
                      type="number"
                      min={0}
                      step="0.01"
                      value={String(addForm.discount_value)}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, discount_value: e.target.value === '' ? 0 : Number(e.target.value) }))}
                      disabled={isCreatingOverride}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="add-reason">Reason</Label>
                    <Input
                      id="add-reason"
                      value={addForm.reason}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, reason: e.target.value }))}
                      disabled={isCreatingOverride}
                      placeholder="Why does this student need an override?"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="add-valid-from">Valid From</Label>
                    <Input
                      id="add-valid-from"
                      type="date"
                      value={addForm.valid_from ? String(addForm.valid_from) : ''}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, valid_from: e.target.value || null }))}
                      disabled={isCreatingOverride}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-valid-until">Valid Until</Label>
                    <Input
                      id="add-valid-until"
                      type="date"
                      value={addForm.valid_until ? String(addForm.valid_until) : ''}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, valid_until: e.target.value || null }))}
                      disabled={isCreatingOverride}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 md:items-end">
                <Button onClick={handleAddOverride} disabled={isCreatingOverride || !addForm.student || !addForm.reason.trim()}>
                  {isCreatingOverride ? 'Adding...' : 'Add Override'}
                </Button>
                {addForm.student && overriddenStudentIds.has(addForm.student) ? (
                  <p className="text-sm text-destructive">This student already has an override.</p>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

