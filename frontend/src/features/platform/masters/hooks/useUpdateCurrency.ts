import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateCurrency } from '../services/mastersApi';
import type { UpdateCurrencyRequest } from '../types';

export const useUpdateCurrency = (id: number | string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateCurrencyRequest) => updateCurrency(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'currencies'] });
      queryClient.invalidateQueries({ queryKey: ['platform', 'currencies', id] });
    },
  });
};

export const useUpdateCurrencyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateCurrencyRequest }) =>
      updateCurrency(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'currencies'] });
      queryClient.invalidateQueries({ queryKey: ['platform', 'currencies', variables.id] });
    },
  });
};
