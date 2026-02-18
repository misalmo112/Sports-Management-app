/**
 * Custom hook for accessing API client
 */
import { useMemo } from 'react';
import apiClient from '../services/api';

export const useApi = () => {
  return useMemo(() => apiClient, []);
};
