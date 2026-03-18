/**
 * Hook for saving age categories
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveAgeCategories } from '../services/settingsApi';
import type { AgeCategoriesPayload } from '../types';

export const useSaveAgeCategories = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AgeCategoriesPayload) => saveAgeCategories(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'state'] });
    },
  });
};
