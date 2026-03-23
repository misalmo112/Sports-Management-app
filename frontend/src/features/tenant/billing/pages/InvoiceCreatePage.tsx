/**
 * Invoice Create Page
 * Create a new invoice with line items
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useCreateInvoice } from '../hooks/hooks';
import { useBillingItems } from '../hooks/hooks';
import { useParents } from '@/features/tenant/students/hooks/useParents';
import { useStudents } from '@/features/tenant/students/hooks/hooks';
import { useLocations } from '@/features/tenant/settings/hooks/hooks';
import { useSports } from '@/features/tenant/settings/hooks/hooks';
import { useAcademyTaxSettings } from '@/features/tenant/settings/hooks/hooks';
import { extractValidationErrors, clearFieldError } from '@/shared/utils/errorUtils';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import type { CreateInvoiceRequest } from '../types';

interface LineItem {
  id: string;
  item_id?: number;
  student_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
}

export const InvoiceCreatePage = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useAcademyFormat();
  const [formData, setFormData] = useState<{
    parent_id?: number;
    due_date?: string;
    issued_date?: string;
    discount_type?: 'PERCENTAGE' | 'FIXED';
    discount_value?: number;
    sport?: number;
    location?: number;
    notes?: string;
  }>({
    due_date: new Date().toISOString().split('T')[0],
    issued_date: new Date().toISOString().split('T')[0],
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParentMeta, setSelectedParentMeta] = useState<{ full_name: string; email: string } | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, unit_price: 0 },
  ]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const createInvoice = useCreateInvoice();
  const { data: itemsData } = useBillingItems({ is_active: true, page_size: 100 });
  const { data: parentsData } = useParents({
    is_active: true,
    search: searchQuery || undefined,
    page_size: 100,
  });
  const { data: studentsData } = useStudents({
    is_active: true,
    ...(formData.parent_id ? { parent: formData.parent_id } : {}),
    // When a parent is selected, show that parent's full student list (unfiltered),
    // since the search term may be a parent name/email and we still want students to appear.
    search: formData.parent_id ? undefined : searchQuery || undefined,
    page_size: 100,
  });
  const { data: locationsData } = useLocations({ page_size: 100 });
  const { data: sportsData } = useSports({ page_size: 100 });
  const { data: taxSettings } = useAcademyTaxSettings({ enabled: true });

  // Calculate totals (matching backend calculation logic)
  const calculateTotals = () => {
    // Round to 2 decimal places to match backend Decimal precision
    const round = (value: number) => Math.round(value * 100) / 100;
    
    const subtotal = round(
      lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0
      )
    );

    let discountAmount = 0;
    if (formData.discount_type && formData.discount_value !== undefined) {
      if (formData.discount_type === 'PERCENTAGE') {
        discountAmount = round((subtotal * formData.discount_value) / 100);
      } else {
        discountAmount = round(Math.min(formData.discount_value, subtotal));
      }
    }

    const globalTaxEnabled = taxSettings?.global_tax_enabled ?? false;
    const taxRatePercent =
      taxSettings?.global_tax_rate_percent !== undefined
        ? Number(taxSettings.global_tax_rate_percent)
        : 0;
    const netAfterDiscount = Math.max(0, subtotal - discountAmount);
    const taxAmount = round(globalTaxEnabled ? (netAfterDiscount * taxRatePercent) / 100 : 0);
    const total = round(Math.max(0, subtotal - discountAmount + taxAmount));

    return { subtotal, discountAmount, taxAmount, total };
  };

  const { subtotal, discountAmount, taxAmount, total } = calculateTotals();

  const selectedStudentIds = useMemo(() => {
    const ids = lineItems.map((li) => li.student_id).filter((id): id is number => id !== undefined);
    // Keep stable ordering + uniqueness
    return Array.from(new Set(ids));
  }, [lineItems]);

  const studentById = useMemo(() => {
    const map = new Map<number, any>();
    if (!studentsData?.results) return map;
    for (const s of studentsData.results) {
      map.set(s.id, s);
    }
    return map;
  }, [studentsData]);

  const getStudentLabel = (studentId?: number) => {
    if (!studentId) return '—';
    const s = studentById.get(studentId);
    if (!s) return `Student #${studentId}`;
    return s.full_name || `${s.first_name} ${s.last_name}`;
  };

  const buildLineItemsFromTemplate = (nextSelectedStudentIds: number[]) => {
    const template = lineItems[0] ?? { id: '1', description: '', quantity: 1, unit_price: 0 };
    const base: Omit<LineItem, 'id' | 'student_id'> = {
      item_id: template.item_id,
      description: template.description,
      quantity: template.quantity,
      unit_price: template.unit_price,
    };

    if (nextSelectedStudentIds.length === 0) {
      return [
        {
          ...base,
          id: template.id,
          student_id: undefined,
        },
      ];
    }

    return nextSelectedStudentIds.map((studentId, idx) => ({
      ...base,
      id: idx === 0 ? template.id : `${Date.now()}_${studentId}_${idx}`,
      student_id: studentId,
    }));
  };

  const handlePickParent = (parent: any) => {
    setSelectedParentMeta({ full_name: parent.full_name, email: parent.email });
    setFormData((prev) => ({ ...prev, parent_id: parent.id }));
    // Clear any student selections when changing parent.
    setLineItems(buildLineItemsFromTemplate([]));
    if (errors.parent_id) setErrors((prev) => clearFieldError(prev, 'parent_id'));
    if (clientErrors.parent_id) setClientErrors((prev) => ({ ...prev, parent_id: '' }));
  };

  const handleToggleStudent = (student: any, nextChecked: boolean) => {
    const studentParentId = student.parent ?? student.parent_detail?.id;
    if (!studentParentId) return;

    const nextSelectedIds = (() => {
      if (nextChecked) {
        if (selectedStudentIds.includes(student.id)) return selectedStudentIds;
        return [...selectedStudentIds, student.id];
      }
      return selectedStudentIds.filter((id) => id !== student.id);
    })();

    // Single-parent constraint: if switching to another student's parent,
    // clear selection to only the clicked student (or keep empty if unchecked).
    if (formData.parent_id !== studentParentId) {
      if (errors.parent_id) setErrors((prev) => clearFieldError(prev, 'parent_id'));
      if (clientErrors.parent_id) setClientErrors((prev) => ({ ...prev, parent_id: '' }));
      setSelectedParentMeta({
        full_name: student.parent_detail?.full_name ?? '',
        email: student.parent_detail?.email ?? '',
      });
      setFormData((prev) => ({ ...prev, parent_id: studentParentId }));
      setLineItems(buildLineItemsFromTemplate(nextChecked ? [student.id] : []));
      return;
    }

    if (errors.parent_id) setErrors((prev) => clearFieldError(prev, 'parent_id'));
    if (clientErrors.parent_id) setClientErrors((prev) => ({ ...prev, parent_id: '' }));
    setLineItems(buildLineItemsFromTemplate(nextSelectedIds));
  };

  const handleToggleSelectAllStudents = (nextChecked: boolean) => {
    const allIds = studentsData?.results?.map((s) => s.id) ?? [];
    setLineItems(buildLineItemsFromTemplate(nextChecked ? allIds : []));
  };

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: Date.now().toString(),
        description: '',
        quantity: 1,
        unit_price: 0,
      },
    ]);
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  };

  const handleLineItemChange = (
    id: string,
    field: keyof LineItem,
    value: string | number | undefined
  ) => {
    // Student auto-link logic (single student per line item)
    if (field === 'student_id') {
      const nextStudentId = value === undefined ? undefined : Number(value);
      const prevParentId = formData.parent_id;

      // Clearing student only affects this row (invoice parent stays as-is).
      if (nextStudentId === undefined || Number.isNaN(nextStudentId)) {
        setLineItems((prev) => prev.map((li) => (li.id === id ? { ...li, student_id: undefined } : li)));
        return;
      }

      const selectedStudent = studentsData?.results.find((s) => s.id === nextStudentId);
      const nextParentId = selectedStudent?.parent ?? selectedStudent?.parent_detail?.id;

      // Switch behavior: if parent changes, clear other line items' student selections.
      const parentChanged = nextParentId !== undefined && nextParentId !== prevParentId;

      // Auto-set invoice parent if we have it from the student.
      if (nextParentId !== undefined) {
        setFormData((prev) => ({ ...prev, parent_id: nextParentId }));
      }

      setLineItems((prev) =>
        prev.map((li) => {
          if (li.id === id) {
            return { ...li, student_id: nextStudentId };
          }
          if (parentChanged) {
            return { ...li, student_id: undefined };
          }
          return li;
        })
      );
      return;
    }

    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        // If item_id is selected, auto-fill description and price
        if (field === 'item_id' && value) {
          const selectedItem = itemsData?.results.find((i) => i.id === Number(value));
          if (selectedItem) {
            updated.description = selectedItem.name;
            updated.unit_price = parseFloat(selectedItem.price);
          }
        }

        return updated;
      })
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.parent_id) {
      newErrors.parent_id = 'Parent is required';
    }

    if (lineItems.length === 0) {
      newErrors.items = 'At least one line item is required';
    } else {
      lineItems.forEach((item, index) => {
        if (!item.description || item.description.trim().length === 0) {
          newErrors[`item_${index}_description`] = 'Description is required';
        }
        if (item.quantity <= 0) {
          newErrors[`item_${index}_quantity`] = 'Quantity must be greater than 0';
        }
        if (item.unit_price < 0) {
          newErrors[`item_${index}_unit_price`] = 'Unit price must be greater than or equal to 0';
        }
      });
    }

    if (formData.discount_type && formData.discount_value === undefined) {
      newErrors.discount_value = 'Discount value is required when discount type is set';
    } else if (formData.discount_type === 'PERCENTAGE' && formData.discount_value) {
      if (formData.discount_value > 100) {
        newErrors.discount_value = 'Percentage discount cannot exceed 100%';
      }
    }

    setClientErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      const submitData: CreateInvoiceRequest = {
        parent_id: formData.parent_id!,
        items: lineItems.map((item) => ({
          item_id: item.item_id,
          student_id: item.student_id,
          description: item.description.trim(),
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      };

      if (formData.due_date) {
        submitData.due_date = formData.due_date;
      }
      if (formData.issued_date) {
        submitData.issued_date = formData.issued_date;
      }
      if (formData.discount_type) {
        submitData.discount_type = formData.discount_type;
      }
      if (formData.discount_value !== undefined) {
        submitData.discount_value = formData.discount_value;
      }
      if (formData.sport) {
        submitData.sport = formData.sport;
      }
      if (formData.location) {
        submitData.location = formData.location;
      }
      if (formData.notes?.trim()) {
        submitData.notes = formData.notes.trim();
      }

      const invoice = await createInvoice.mutateAsync(submitData);
      navigate(`/dashboard/finance/invoices/${invoice.id}`);
    } catch (error: any) {
      const validationErrors = extractValidationErrors(error);
      if (validationErrors) {
        setErrors(validationErrors);
      } else {
        setErrors({
          non_field_errors: [error.message || 'Failed to create invoice'],
        });
      }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard/finance/invoices')}>
          ← Back to Invoices
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Information</CardTitle>
              <CardDescription>Basic invoice details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {errors.non_field_errors && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {errors.non_field_errors.map((err, idx) => (
                      <div key={idx}>{err}</div>
                    ))}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-2">
                <Label htmlFor="invoice-party-search">
                  Search by parent name/email or student name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="invoice-party-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type and select from results below..."
                  disabled={createInvoice.isPending}
                />

                {selectedParentMeta && (
                  <p className="text-sm text-muted-foreground">
                    Selected parent: {selectedParentMeta.full_name} ({selectedParentMeta.email})
                  </p>
                )}

                {(errors.parent_id || clientErrors.parent_id) && (
                  <p className="text-sm text-destructive">
                    {errors.parent_id?.[0] || clientErrors.parent_id}
                  </p>
                )}
              </div>

              {searchQuery.trim() && parentsData?.results?.length ? (
                <div className="space-y-2">
                  <Label>Parent matches</Label>
                  <div className="space-y-2">
                    {parentsData.results.map((parent) => (
                      <div
                        key={parent.id}
                        className="flex items-center justify-between gap-3 border rounded-lg p-2"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{parent.full_name}</div>
                          <div className="text-sm text-muted-foreground truncate">{parent.email}</div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handlePickParent(parent)}
                          disabled={createInvoice.isPending}
                        >
                          Select
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {formData.parent_id ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Students for selected parent</Label>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={
                          studentsData?.results?.length
                            ? selectedStudentIds.length === studentsData.results.length
                            : false
                        }
                        onChange={(e) => handleToggleSelectAllStudents(e.target.checked)}
                        disabled={createInvoice.isPending || !studentsData?.results?.length}
                      />
                      Select all
                    </label>
                  </div>

                  <div className="space-y-2">
                    {studentsData?.results?.length ? (
                      studentsData.results.map((student) => {
                        const isChecked = selectedStudentIds.includes(student.id);
                        return (
                          <label
                            key={student.id}
                            className="flex items-center gap-2 border rounded-lg p-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleToggleStudent(student, e.target.checked)}
                              disabled={createInvoice.isPending}
                            />
                            <div className="min-w-0">
                              <div className="font-medium truncate">
                                {student.full_name || `${student.first_name} ${student.last_name}`}
                              </div>
                            </div>
                          </label>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">No students found.</p>
                    )}
                  </div>
                </div>
              ) : searchQuery.trim() ? (
                <div className="space-y-2">
                  <Label>Student matches</Label>
                  <div className="space-y-2">
                    {studentsData?.results?.length ? (
                      studentsData.results.map((student) => {
                        const isChecked = selectedStudentIds.includes(student.id);
                        return (
                          <label
                            key={student.id}
                            className="flex items-center gap-2 border rounded-lg p-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleToggleStudent(student, e.target.checked)}
                              disabled={createInvoice.isPending}
                            />
                            <div className="min-w-0">
                              <div className="font-medium truncate">
                                {student.full_name || `${student.first_name} ${student.last_name}`}
                              </div>
                            </div>
                          </label>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">No student matches.</p>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="issued_date">Issued Date</Label>
                  <Input
                    id="issued_date"
                    type="date"
                    value={formData.issued_date || ''}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, issued_date: e.target.value }));
                      if (errors.issued_date)
                        setErrors((prev) => clearFieldError(prev, 'issued_date'));
                    }}
                    disabled={createInvoice.isPending}
                  />
                  {errors.issued_date && (
                    <p className="text-sm text-destructive">{errors.issued_date[0]}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date || ''}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, due_date: e.target.value }));
                      if (errors.due_date)
                        setErrors((prev) => clearFieldError(prev, 'due_date'));
                    }}
                    disabled={createInvoice.isPending}
                  />
                  {errors.due_date && (
                    <p className="text-sm text-destructive">{errors.due_date[0]}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sport">Sport</Label>
                  <Select
                    value={formData.sport?.toString() || '__none__'}
                    onValueChange={(value) => {
                      setFormData((prev) => ({
                        ...prev,
                        sport: value === '__none__' ? undefined : parseInt(value),
                      }));
                      if (errors.sport) setErrors((prev) => clearFieldError(prev, 'sport'));
                    }}
                    disabled={createInvoice.isPending}
                  >
                    <SelectTrigger id="sport">
                      <SelectValue placeholder="Select a sport (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No sport assigned</SelectItem>
                      {sportsData?.results.map((sport) => (
                        <SelectItem key={sport.id} value={sport.id.toString()}>
                          {sport.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.sport && (
                    <p className="text-sm text-destructive">{errors.sport[0]}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Select
                    value={formData.location?.toString() || '__none__'}
                    onValueChange={(value) => {
                      setFormData((prev) => ({
                        ...prev,
                        location: value === '__none__' ? undefined : parseInt(value),
                      }));
                      if (errors.location) setErrors((prev) => clearFieldError(prev, 'location'));
                    }}
                    disabled={createInvoice.isPending}
                  >
                    <SelectTrigger id="location">
                      <SelectValue placeholder="Select a location (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No location assigned</SelectItem>
                      {locationsData?.results.map((location) => (
                        <SelectItem key={location.id} value={location.id.toString()}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.location && (
                    <p className="text-sm text-destructive">{errors.location[0]}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Line Items</CardTitle>
                  <CardDescription>Add items to this invoice</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLineItem}
                  disabled={createInvoice.isPending}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {errors.items && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.items[0]}</AlertDescription>
                </Alert>
              )}

              {lineItems.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {lineItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveLineItem(item.id)}
                        disabled={createInvoice.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Billing Item (Optional)</Label>
                      <Select
                        value={item.item_id?.toString() || '__custom__'}
                        onValueChange={(value) =>
                          handleLineItemChange(item.id, 'item_id', value === '__custom__' ? undefined : parseInt(value, 10))
                        }
                        disabled={createInvoice.isPending}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a billing item" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__custom__">Custom Item</SelectItem>
                          {itemsData?.results.map((billingItem) => (
                            <SelectItem key={billingItem.id} value={billingItem.id.toString()}>
                              {billingItem.name} ({formatCurrency(parseFloat(billingItem.price))})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>
                        Description <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          handleLineItemChange(item.id, 'description', e.target.value)
                        }
                        placeholder="Item description"
                        disabled={createInvoice.isPending}
                        required
                      />
                      {errors[`item_${index}_description`] && (
                        <p className="text-sm text-destructive">
                          {errors[`item_${index}_description`]?.[0] ||
                            clientErrors[`item_${index}_description`]}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label>Student</Label>
                        <div className="text-sm text-muted-foreground">
                          {getStudentLabel(item.student_id)}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label>
                          Quantity <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleLineItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)
                          }
                          disabled={createInvoice.isPending}
                          required
                        />
                        {errors[`item_${index}_quantity`] && (
                          <p className="text-sm text-destructive">
                            {errors[`item_${index}_quantity`]?.[0] ||
                              clientErrors[`item_${index}_quantity`]}
                          </p>
                        )}
                      </div>

                      <div className="grid gap-2">
                        <Label>
                          Unit Price <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) =>
                            handleLineItemChange(
                              item.id,
                              'unit_price',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={createInvoice.isPending}
                          required
                        />
                        {errors[`item_${index}_unit_price`] && (
                          <p className="text-sm text-destructive">
                            {errors[`item_${index}_unit_price`]?.[0] ||
                              clientErrors[`item_${index}_unit_price`]}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-sm font-medium">
                      Line Total: {formatCurrency(item.quantity * item.unit_price)}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Discounts & Tax */}
          <Card>
            <CardHeader>
              <CardTitle>Discounts & Tax</CardTitle>
              <CardDescription>Apply discounts and tax to the invoice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="discount_type">Discount Type</Label>
                  <Select
                    value={formData.discount_type || '__none__'}
                    onValueChange={(value) => {
                      setFormData((prev) => ({
                        ...prev,
                        discount_type: value === '__none__' ? undefined : (value as 'PERCENTAGE' | 'FIXED'),
                        discount_value: value === '__none__' ? undefined : prev.discount_value,
                      }));
                      if (errors.discount_type)
                        setErrors((prev) => clearFieldError(prev, 'discount_type'));
                    }}
                    disabled={createInvoice.isPending}
                  >
                    <SelectTrigger id="discount_type">
                      <SelectValue placeholder="No discount" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No Discount</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                      <SelectItem value="FIXED">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.discount_type && (
                    <p className="text-sm text-destructive">{errors.discount_type[0]}</p>
                  )}
                </div>

                {formData.discount_type && (
                  <div className="grid gap-2">
                    <Label htmlFor="discount_value">
                      Discount Value <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="discount_value"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.discount_value || ''}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          discount_value: e.target.value ? parseFloat(e.target.value) : undefined,
                        }));
                        if (errors.discount_value)
                          setErrors((prev) => clearFieldError(prev, 'discount_value'));
                        if (clientErrors.discount_value)
                          setClientErrors((prev) => ({ ...prev, discount_value: '' }));
                      }}
                      placeholder={formData.discount_type === 'PERCENTAGE' ? '0-100' : '0.00'}
                      disabled={createInvoice.isPending}
                    />
                    {(errors.discount_value || clientErrors.discount_value) && (
                      <p className="text-sm text-destructive">
                        {errors.discount_value?.[0] || clientErrors.discount_value}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tax_amount">Tax Amount</Label>
                <Input
                  id="tax_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={taxAmount || ''}
                  disabled
                  readOnly
                />
                <p className="text-sm text-muted-foreground">
                  Computed from academy global tax rate (net: subtotal minus discount).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount:</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax:</span>
                    <span>+{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Additional notes for this invoice</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, notes: e.target.value }));
                  if (errors.notes) setErrors((prev) => clearFieldError(prev, 'notes'));
                }}
                rows={4}
                placeholder="Optional notes..."
                disabled={createInvoice.isPending}
              />
              {errors.notes && (
                <p className="text-sm text-destructive mt-2">{errors.notes[0]}</p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard/finance/invoices')}
              disabled={createInvoice.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createInvoice.isPending}>
              {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
