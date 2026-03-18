import { useQuery } from '@tanstack/react-query';
import { getOnboardingTemplates } from '../services/onboardingApi';

export const useOnboardingTemplates = () => {
  const query = useQuery({
    queryKey: ['onboarding', 'templates'],
    queryFn: getOnboardingTemplates,
  });

  return {
    templates: query.data?.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

