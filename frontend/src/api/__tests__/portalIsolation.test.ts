import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import portalAxios from '@/api/portalAxios';
import { usePortalAuth } from '@/hooks/usePortalAuth';

describe('portal token isolation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses portal_access_token and not staff auth_token for portal axios Authorization', () => {
    localStorage.setItem('auth_token', 'staff-token');
    localStorage.setItem('portal_access_token', 'portal-token');

    const requestInterceptor = (portalAxios.interceptors.request as any).handlers[0].fulfilled as (
      config: { headers?: Record<string, string> }
    ) => { headers: Record<string, string> };

    const nextConfig = requestInterceptor({ headers: {} });
    expect(nextConfig.headers.Authorization).toBe('Bearer portal-token');
  });

  it('portal isAuthenticated ignores staff auth_token key', () => {
    localStorage.setItem('auth_token', 'staff-token');

    const { result } = renderHook(() => usePortalAuth());
    expect(result.current.isAuthenticated()).toBe(false);
  });
});

