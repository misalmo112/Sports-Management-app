/**
 * Formatting helpers using academy settings.
 */
import { useAcademySettingsContext } from '@/shared/context/AcademySettingsContext';

export const useAcademyFormat = () => {
  const { settings } = useAcademySettingsContext();
  const currency = settings?.currency || 'USD';
  const timeZone = settings?.timezone || undefined;

  const formatCurrency = (amount: string | number, currencyOverride?: string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '—';
    const resolvedCurrency = currencyOverride || currency;
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: resolvedCurrency,
    }).format(numAmount);
  };

  const formatDateTime = (value?: string | number | Date | null) => {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  return {
    currency,
    timeZone,
    formatCurrency,
    formatDateTime,
  };
};
