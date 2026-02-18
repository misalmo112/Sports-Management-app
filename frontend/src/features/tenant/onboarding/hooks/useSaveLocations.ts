/**
 * Hook for saving locations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveLocations } from '../services/settingsApi';
import type { Step2Locations } from '../types';

export const useSaveLocations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Step2Locations) => saveLocations(data),
    onSuccess: () => {
      // Invalidate onboarding state to refresh data
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'state'] });
    },
  });
};
