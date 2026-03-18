import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTimezone } from '../services/mastersApi';
import type { UpdateTimezoneRequest } from '../types';

export const useUpdateTimezone = (id: number | string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateTimezoneRequest) => updateTimezone(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'timezones'] });
      queryClient.invalidateQueries({ queryKey: ['platform', 'timezones', id] });
    },
  });
};

export const useUpdateTimezoneMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateTimezoneRequest }) =>
      updateTimezone(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'timezones'] });
      queryClient.invalidateQueries({ queryKey: ['platform', 'timezones', variables.id] });
    },
  });
};
