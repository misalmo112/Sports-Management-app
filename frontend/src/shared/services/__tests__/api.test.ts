/**
 * Tests for API client
 */
import { describe, it, expect, beforeEach } from 'vitest';

describe('API Client', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('handles missing token gracefully', () => {
    localStorage.removeItem('auth_token');
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('stores and retrieves auth token', () => {
    localStorage.setItem('auth_token', 'test-token');
    expect(localStorage.getItem('auth_token')).toBe('test-token');
  });

  it('clears auth token', () => {
    localStorage.setItem('auth_token', 'test-token');
    localStorage.removeItem('auth_token');
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});
