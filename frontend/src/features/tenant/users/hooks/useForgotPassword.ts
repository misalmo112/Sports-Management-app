/**
 * Hook for requesting a password reset email
 */
import { useMutation } from '@tanstack/react-query';
import { forgotPassword } from '../services/usersApi';

export const useForgotPassword = () => {
  return useMutation<{ detail: string }, Error, string>({
    mutationFn: (email) => forgotPassword(email),
  });
};
