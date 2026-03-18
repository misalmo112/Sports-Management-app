import { useQuery } from '@tanstack/react-query';

import { getFinanceSummary } from '../services/financeApi';
import type { FinanceSummary } from '../types';

export const useFinanceSummary = (year?: number, month?: number) => {
  return useQuery<FinanceSummary, Error>({
    queryKey: ['finance-summary', year, month],
    queryFn: () => getFinanceSummary(year, month),
    refetchOnWindowFocus: false,
  });
};
