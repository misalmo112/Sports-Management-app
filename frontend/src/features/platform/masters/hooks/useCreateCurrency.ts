import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCurrency } from '../services/mastersApi';
import type { CreateCurrencyRequest } from '../types';

export const useCreateCurrency = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCurrencyRequest) => createCurrency(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'currencies'] });
    },
  });
};
