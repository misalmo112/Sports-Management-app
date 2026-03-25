import axios from 'axios';
import { PORTAL_ACCESS_TOKEN_KEY, PORTAL_REFRESH_TOKEN_KEY } from '@/hooks/usePortalAuth';

const portalAxios = axios.create({
  baseURL: '/api/v1/',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

let isRefreshing = false;
let queuedRequests = [];

const resolveQueue = (error, token = null) => {
  queuedRequests.forEach((pending) => {
    if (error) {
      pending.reject(error);
      return;
    }
    pending.resolve(token);
  });
  queuedRequests = [];
};

portalAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem(PORTAL_ACCESS_TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

portalAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    if (!originalRequest || error?.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queuedRequests.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return portalAxios(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem(PORTAL_REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        throw new Error('Missing portal refresh token');
      }

      const refreshResponse = await axios.post('/api/v1/auth/portal/refresh/', {
        refresh: refreshToken,
      });

      const nextAccessToken = refreshResponse?.data?.access;
      if (!nextAccessToken) {
        throw new Error('Portal refresh response missing access token');
      }

      localStorage.setItem(PORTAL_ACCESS_TOKEN_KEY, nextAccessToken);
      resolveQueue(null, nextAccessToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
      }
      return portalAxios(originalRequest);
    } catch (refreshError) {
      localStorage.removeItem(PORTAL_ACCESS_TOKEN_KEY);
      localStorage.removeItem(PORTAL_REFRESH_TOKEN_KEY);
      resolveQueue(refreshError, null);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default portalAxios;

