/**
 * Hook for accepting invitations
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { acceptInvite, validateInviteToken } from '../services/usersApi';
import type {
  AcceptInviteRequest,
  AcceptInviteResponse,
  ValidateInviteResponse,
} from '../types';

export const useValidateInvite = (token: string, enabled: boolean = true) => {
  return useQuery<ValidateInviteResponse, Error>({
    queryKey: ['invite', 'validate', token],
    queryFn: () => validateInviteToken(token),
    enabled: enabled && !!token,
    retry: false,
  });
};

export const useAcceptInvite = () => {
  return useMutation<
    AcceptInviteResponse,
    Error,
    { token: string; data: AcceptInviteRequest }
  >({
    mutationFn: ({ token, data }) => acceptInvite(token, data),
  });
};
