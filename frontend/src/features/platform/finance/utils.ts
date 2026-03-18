import { isAxiosError } from 'axios';

import type { ValidationErrors } from './types';

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const EXPENSE_CATEGORY_OPTIONS = [
  { value: 'CLOUD', label: 'Cloud' },
  { value: 'DOMAIN', label: 'Domain & DNS' },
  { value: 'SERVER', label: 'Server / VPS' },
  { value: 'SAAS', label: 'SaaS Tool' },
  { value: 'LEGAL', label: 'Legal & Compliance' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const BILLING_CYCLE_OPTIONS = [
  { value: 'ONE_TIME', label: 'One-time' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
] as const;

export const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export const formatCurrency = (value: string | number, currency = 'USD') => {
  const numericValue = typeof value === 'number' ? value : parseFloat(value || '0');

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isNaN(numericValue) ? 0 : numericValue);
};

export const formatDate = (value: string | null) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString();
};

export const formatPaymentMethod = (value: string) => {
  return PAYMENT_METHOD_OPTIONS.find((option) => option.value === value)?.label ?? value;
};

export const formatExpenseCategory = (value: string) => {
  return EXPENSE_CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value;
};

export const formatBillingCycle = (value: string) => {
  return BILLING_CYCLE_OPTIONS.find((option) => option.value === value)?.label ?? value;
};

export const extractFinanceValidationErrors = (error: unknown): ValidationErrors | null => {
  if (!isAxiosError(error) || !error.response || typeof error.response.data !== 'object' || !error.response.data) {
    return null;
  }

  const responseData = error.response.data as Record<string, unknown>;
  const fieldErrors: ValidationErrors = {};

  for (const [field, messages] of Object.entries(responseData)) {
    if (Array.isArray(messages) && messages.every((message) => typeof message === 'string')) {
      fieldErrors[field] = messages as string[];
    }
  }

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
};
