/**
 * Hook for saving sports
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveSports } from '../services/settingsApi';
import type { Step3Sports } from '../types';

export const useSaveSports = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Step3Sports) => saveSports(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'state'] });
    },
  });
};
