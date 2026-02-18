/**
 * Invoice Create Page
 * Create a new invoice with line items
 */
import { useState } from 'react';
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
    tax_amount?: number;
    sport?: number;
    location?: number;
    notes?: string;
  }>({
    due_date: new Date().toISOString().split('T')[0],
    issued_date: new Date().toISOString().split('T')[0],
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, unit_price: 0 },
  ]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const createInvoice = useCreateInvoice();
  const { data: itemsData } = useBillingItems({ is_active: true, page_size: 100 });
  const { data: parentsData } = useParents({ is_active: true, page_size: 100 });
  const { data: studentsData } = useStudents({
    parent: formData.parent_id,
    is_active: true,
    page_size: 100,
  });
  const { data: locationsData } = useLocations({ page_size: 100 });
  const { data: sportsData } = useSports({ page_size: 100 });

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

    const taxAmount = round(formData.tax_amount || 0);
    const total = round(Math.max(0, subtotal - discountAmount + taxAmount));

    return { subtotal, discountAmount, taxAmount, total };
  };

  const { subtotal, discountAmount, taxAmount, total } = calculateTotals();

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
    setLineItems(
      lineItems.map((item) => {
        if (item.id === id) {
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
        }
        return item;
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

    if (formData.tax_amount !== undefined && formData.tax_amount < 0) {
      newErrors.tax_amount = 'Tax amount must be greater than or equal to 0';
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
      if (formData.tax_amount !== undefined) {
        submitData.tax_amount = formData.tax_amount;
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
                <Label htmlFor="parent_id">
                  Parent <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.parent_id?.toString() || ''}
                  onValueChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      parent_id: value ? parseInt(value) : undefined,
                    }));
                    if (errors.parent_id) setErrors((prev) => clearFieldError(prev, 'parent_id'));
                    if (clientErrors.parent_id)
                      setClientErrors((prev) => ({ ...prev, parent_id: '' }));
                  }}
                  disabled={createInvoice.isPending}
                >
                  <SelectTrigger id="parent_id">
                    <SelectValue placeholder="Select a parent" />
                  </SelectTrigger>
                  <SelectContent>
                    {parentsData?.results.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id.toString()}>
                        {parent.full_name} ({parent.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(errors.parent_id || clientErrors.parent_id) && (
                  <p className="text-sm text-destructive">
                    {errors.parent_id?.[0] || clientErrors.parent_id}
                  </p>
                )}
              </div>

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
                        <Label>
                          Student (Optional)
                        </Label>
                        <Select
                          value={item.student_id?.toString() || '__none__'}
                          onValueChange={(value) =>
                            handleLineItemChange(
                              item.id,
                              'student_id',
                              value === '__none__' ? 0 : parseInt(value, 10)
                            )
                          }
                          disabled={createInvoice.isPending || !formData.parent_id}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select student" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {studentsData?.results.map((student) => (
                              <SelectItem key={student.id} value={student.id.toString()}>
                                {student.full_name || `${student.first_name} ${student.last_name}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                  value={formData.tax_amount || ''}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      tax_amount: e.target.value ? parseFloat(e.target.value) : undefined,
                    }));
                    if (errors.tax_amount)
                      setErrors((prev) => clearFieldError(prev, 'tax_amount'));
                    if (clientErrors.tax_amount)
                      setClientErrors((prev) => ({ ...prev, tax_amount: '' }));
                  }}
                  placeholder="0.00"
                  disabled={createInvoice.isPending}
                />
                {(errors.tax_amount || clientErrors.tax_amount) && (
                  <p className="text-sm text-destructive">
                    {errors.tax_amount?.[0] || clientErrors.tax_amount}
                  </p>
                )}
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
