import { useQuery } from '@tanstack/react-query';

import { getPlatformPayments } from '../services/financeApi';
import type { PaginatedResponse, PlatformPayment } from '../types';

export const usePlatformPayments = (params?: {
  academy?: string;
  subscription?: number;
  payment_date_after?: string;
  payment_date_before?: string;
  page?: number;
}) => {
  return useQuery<PaginatedResponse<PlatformPayment>, Error>({
    queryKey: ['platform-payments', params],
    queryFn: () => getPlatformPayments(params),
    refetchOnWindowFocus: false,
  });
};
