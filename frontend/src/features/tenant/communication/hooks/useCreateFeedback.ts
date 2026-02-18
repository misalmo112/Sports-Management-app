/**
 * Hook for creating feedback (parent only)
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFeedback } from '../services/feedbackApi';
import type { CreateFeedbackRequest, Feedback } from '../types';

export const useCreateFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation<Feedback, Error, CreateFeedbackRequest>({
    mutationFn: createFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback', 'list'] });
    },
  });
};
