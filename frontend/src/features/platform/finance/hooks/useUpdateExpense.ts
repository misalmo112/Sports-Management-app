import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateOperationalExpense } from '../services/financeApi';
import type { OperationalExpense, OperationalExpenseCreate } from '../types';

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation<
    OperationalExpense,
    Error,
    { id: number; data: Partial<OperationalExpenseCreate> }
  >({
    mutationFn: ({ id, data }) => updateOperationalExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });
};
