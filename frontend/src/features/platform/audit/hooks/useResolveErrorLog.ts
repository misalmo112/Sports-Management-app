/**
 * Mutation hook for resolving an error log entry.
 * On success, invalidates both the error logs list and summary queries.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { resolveErrorLog } from '../services/auditApi';

export const useResolveErrorLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => resolveErrorLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-logs'] });
      queryClient.invalidateQueries({ queryKey: ['error-log-summary'] });
    },
  });
};
