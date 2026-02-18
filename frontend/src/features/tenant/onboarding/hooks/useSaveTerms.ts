/**
 * Hook for saving terms
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveTerms } from '../services/settingsApi';
import type { Step5Terms } from '../types';

export const useSaveTerms = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Step5Terms) => saveTerms(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'state'] });
    },
  });
};
