/**
 * Test setup file for Vitest
 */
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import '@testing-library/jest-dom/vitest';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock lucide-react icons
vi.mock('lucide-react', async () => {
  const React = await import('react');
  return {
    Check: ({ className }: { className?: string }) => 
      React.createElement('span', { 'data-testid': 'check-icon', className }, '✓'),
    Loader2: ({ className }: { className?: string }) => 
      React.createElement('span', { 'data-testid': 'loader-icon', className }, '⏳'),
    Plus: ({ className }: { className?: string }) => 
      React.createElement('span', { 'data-testid': 'plus-icon', className }, '+'),
    Inbox: ({ className }: { className?: string }) =>
      React.createElement('span', { 'data-testid': 'inbox-icon', className }, '📥'),
    AlertCircle: ({ className }: { className?: string }) =>
      React.createElement('span', { 'data-testid': 'alert-circle-icon', className }, '!'),
    RefreshCw: ({ className }: { className?: string }) =>
      React.createElement('span', { 'data-testid': 'refresh-icon', className }, '⟳'),
    Trash2: ({ className }: { className?: string }) => 
      React.createElement('span', { 'data-testid': 'trash-icon', className }, '🗑'),
  };
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});
