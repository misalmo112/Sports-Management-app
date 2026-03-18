import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createPlatformPayment } from '../services/financeApi';
import type { PlatformPayment, PlatformPaymentCreate } from '../types';

export const useCreatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation<PlatformPayment, Error, PlatformPaymentCreate>({
    mutationFn: createPlatformPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-payments'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });
};
