/**
 * Hook for fetching feedback list (admin only)
 */
import { useQuery } from '@tanstack/react-query';
import { getFeedback } from '../services/feedbackApi';
import type { FeedbackListResponse } from '../types';

export const useFeedback = (params?: {
  status?: string;
  priority?: string;
  page?: number;
}) => {
  return useQuery<FeedbackListResponse, Error>({
    queryKey: ['feedback', 'list', params],
    queryFn: () => getFeedback(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};
