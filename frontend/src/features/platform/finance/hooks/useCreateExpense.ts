import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createOperationalExpense } from '../services/financeApi';
import type { OperationalExpense, OperationalExpenseCreate } from '../types';

export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation<OperationalExpense, Error, OperationalExpenseCreate>({
    mutationFn: createOperationalExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });
};
