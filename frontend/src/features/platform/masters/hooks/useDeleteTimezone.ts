import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteTimezone } from '../services/mastersApi';

export const useDeleteTimezone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => deleteTimezone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'timezones'] });
    },
  });
};
