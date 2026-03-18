import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteCurrency } from '../services/mastersApi';

export const useDeleteCurrency = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => deleteCurrency(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'currencies'] });
    },
  });
};
