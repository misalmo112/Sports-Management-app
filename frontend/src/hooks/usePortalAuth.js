import { useCallback } from 'react';

export const PORTAL_ACCESS_TOKEN_KEY = 'portal_access_token';
export const PORTAL_REFRESH_TOKEN_KEY = 'portal_refresh_token';
export const PORTAL_USER_KEY = 'portal_user';

export function usePortalAuth() {
  const login = useCallback((payload) => {
    if (payload?.accessToken) {
      localStorage.setItem(PORTAL_ACCESS_TOKEN_KEY, payload.accessToken);
    }
    if (payload?.refreshToken) {
      localStorage.setItem(PORTAL_REFRESH_TOKEN_KEY, payload.refreshToken);
    }
    if (payload?.user) {
      localStorage.setItem(PORTAL_USER_KEY, JSON.stringify(payload.user));
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(PORTAL_ACCESS_TOKEN_KEY);
    localStorage.removeItem(PORTAL_REFRESH_TOKEN_KEY);
    localStorage.removeItem(PORTAL_USER_KEY);
  }, []);

  const isAuthenticated = useCallback(() => {
    return Boolean(localStorage.getItem(PORTAL_ACCESS_TOKEN_KEY));
  }, []);

  const currentUser = useCallback(() => {
    const raw = localStorage.getItem(PORTAL_USER_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  return {
    login,
    logout,
    isAuthenticated,
    currentUser,
  };
}

