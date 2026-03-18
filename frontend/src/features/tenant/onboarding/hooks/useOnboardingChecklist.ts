import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getOnboardingChecklist, updateOnboardingChecklist } from '../services/onboardingApi';
import type { OnboardingChecklistState } from '../types';

export const useOnboardingChecklist = () => {
  const queryClient = useQueryClient();

  const checklistQuery = useQuery({
    queryKey: ['onboarding', 'checklist'],
    queryFn: getOnboardingChecklist,
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<OnboardingChecklistState>) => updateOnboardingChecklist(patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'checklist'] });
    },
  });

  return {
    state: checklistQuery.data?.data,
    isLoading: checklistQuery.isLoading,
    error: checklistQuery.error,
    update: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    refetch: checklistQuery.refetch,
  };
};

