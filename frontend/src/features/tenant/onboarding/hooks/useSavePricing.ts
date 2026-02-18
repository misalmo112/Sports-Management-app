/**
 * Hook for saving pricing
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { savePricing } from '../services/settingsApi';
import type { Step6Pricing } from '../types';

export const useSavePricing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Step6Pricing) => savePricing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'state'] });
    },
  });
};
