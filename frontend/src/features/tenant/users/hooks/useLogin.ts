/**
 * Hook for user login
 */
import { useMutation } from '@tanstack/react-query';
import { login } from '../services/usersApi';
import type { LoginRequest, LoginResponse } from '../types';

export const useLogin = () => {
  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: (data) => login(data),
  });
};
