/**
 * Hook for updating feedback (admin only)
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateFeedback } from '../services/feedbackApi';
import type { UpdateFeedbackRequest, Feedback } from '../types';

export const useUpdateFeedback = (id: number | string) => {
  const queryClient = useQueryClient();

  return useMutation<Feedback, Error, UpdateFeedbackRequest>({
    mutationFn: (data) => updateFeedback(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['feedback', 'detail', id] });
    },
  });
};
