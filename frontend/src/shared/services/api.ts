/**
 * Axios API client configuration
 */
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Get API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:23',message:'API request interceptor',data:{url:config.url,method:config.method,baseURL:config.baseURL,hasToken:!!localStorage.getItem('auth_token'),academyId:localStorage.getItem('selected_academy_id')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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
  (error: AxiosError) => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:39',message:'API request interceptor error',data:{errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling
 */
apiClient.interceptors.response.use(
  (response) => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:47',message:'API response interceptor success',data:{url:response.config?.url,status:response.status,hasData:!!response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return response;
  },
  (error: AxiosError) => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/4a32c0a0-4b97-4ce7-bbfd-e1102b6601f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:51',message:'API response interceptor error',data:{url:error.config?.url,hasResponse:!!error.response,status:error.response?.status,statusText:error.response?.statusText,hasRequest:!!error.request,errorMessage:error.message,errorCode:error.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      
      if (status === 401) {
        // Unauthorized - clear token and redirect to login so user can re-authenticate
        localStorage.removeItem('auth_token');
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        if (currentPath && currentPath !== '/login' && !currentPath.startsWith('/auth/')) {
          window.location.href = '/login';
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
