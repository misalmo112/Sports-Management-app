import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTimezone } from '../services/mastersApi';
import type { CreateTimezoneRequest } from '../types';

export const useCreateTimezone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTimezoneRequest) => createTimezone(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'timezones'] });
    },
  });
};
