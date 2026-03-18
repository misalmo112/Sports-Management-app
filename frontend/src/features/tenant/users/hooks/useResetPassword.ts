/**
 * Hook for resetting password with token
 */
import { useMutation } from '@tanstack/react-query';
import { resetPassword } from '../services/usersApi';

export const useResetPassword = () => {
  return useMutation<
    { detail: string },
    Error,
    { token: string; password: string; password_confirm: string }
  >({
    mutationFn: (data) => resetPassword(data),
  });
};
