import { useQuery } from '@tanstack/react-query';

import { getOperationalExpenses } from '../services/financeApi';
import type { OperationalExpense, PaginatedResponse } from '../types';

export const useOperationalExpenses = (params?: {
  category?: string;
  billing_cycle?: string;
  is_paid?: boolean;
  paid_date_after?: string;
  paid_date_before?: string;
  page?: number;
}) => {
  return useQuery<PaginatedResponse<OperationalExpense>, Error>({
    queryKey: ['operational-expenses', params],
    queryFn: () => getOperationalExpenses(params),
    refetchOnWindowFocus: false,
  });
};
