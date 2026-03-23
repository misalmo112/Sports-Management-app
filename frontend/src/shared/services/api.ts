/**
 * Axios API client configuration
 */
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// In dev, default to same-origin so Vite can proxy /api (see vite.config.ts). Set VITE_API_URL to override.
const API_BASE_URL =
  typeof import.meta.env.VITE_API_URL === 'string' && import.meta.env.VITE_API_URL.trim() !== ''
    ? import.meta.env.VITE_API_URL.trim()
    : import.meta.env.DEV
      ? ''
      : 'http://localhost:8000';

/**
 * Create axios instance with base configuration
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

/**
 * Request interceptor for adding auth tokens and academy context
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add Authorization header
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add X-Academy-ID header if available (optional, as JWT may include academy_id)
    const academyId = localStorage.getItem('selected_academy_id');
    if (academyId && config.headers) {
      config.headers['X-Academy-ID'] = academyId;
    }
    
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

/**
 * Response interceptor for error handling
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      
      if (status === 401) {
        // Unauthorized - clear token and redirect to login so user can re-authenticate
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const isOnboarding = currentPath === '/onboarding';
        // Don't redirect away from onboarding on 401: let the page show error so user isn't stuck in a loop
        if (!isOnboarding) {
          localStorage.removeItem('auth_token');
          if (currentPath && currentPath !== '/login' && !currentPath.startsWith('/auth/')) {
            window.location.href = '/login';
          }
        }
      }
      
      if (status === 403) {
        // Forbidden - onboarding not completed
        // This will be handled by the component
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('Network error:', error.request);
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
