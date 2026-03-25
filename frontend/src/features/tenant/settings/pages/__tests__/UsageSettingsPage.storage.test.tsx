import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test/utils/testUtils';

import { UsageSettingsPage } from '../UsageSettingsPage';

const useAcademyUsageMock = vi.fn();

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual<typeof import('lucide-react')>('lucide-react');
  return actual;
});

vi.mock('../../hooks/hooks', () => ({
  useAcademyUsage: () => useAcademyUsageMock(),
}));

const buildMockPayload = (overrides: Partial<{
  storageStatus: 'unlimited' | 'ok' | 'warning' | 'exceeded';
  storageUsagePct: number;
}>) => {
  const storageStatus = overrides.storageStatus ?? 'ok';
  const storageUsagePct = overrides.storageUsagePct ?? 30;

  const quota = {
    id: 1,
    academy_id: '1',
    academy_name: 'Test Academy',
    storage_bytes_limit: 10_000,
    max_students: 100,
    max_coaches: 10,
    max_admins: 5,
    max_classes: 20,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return {
    quota,
    usage: {
      storage_used_bytes: 2_500,
      storage_used_gb: 0.0002,
      db_size_bytes: 3_000,
      db_size_gb: 0.0003,
      total_used_bytes: 5_500,
      total_used_gb: 0.0005,
      storage_status: storageStatus,
      storage_usage_pct: storageUsagePct,
      storage_warning_threshold_pct: 80,
      students_count: 42,
      coaches_count: 4,
      admins_count: 1,
      classes_count: 8,
      counts_computed_at: new Date('2026-01-01T12:00:00Z').toISOString(),
    },
  };
};

describe('UsageSettingsPage - StorageMetric banners', () => {
  it('renders amber warning banner when storageStatus="warning"', () => {
    const usagePct = 78;
    useAcademyUsageMock.mockReturnValue({
      data: buildMockPayload({ storageStatus: 'warning', storageUsagePct: usagePct }),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UsageSettingsPage />);

    expect(screen.getByText(`${usagePct}% used — approaching storage limit`)).toBeInTheDocument();
  });

  it('renders red exceeded banner and red progress indicator when storageStatus="exceeded"', () => {
    useAcademyUsageMock.mockReturnValue({
      data: buildMockPayload({ storageStatus: 'exceeded', storageUsagePct: 99 }),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<UsageSettingsPage />);

    expect(
      screen.getByText('Storage limit reached — uploads are blocked')
    ).toBeInTheDocument();
    expect(container.querySelector('.bg-red-500')).toBeInTheDocument();
  });

  it('renders no storage banner when storageStatus="ok"', () => {
    const usagePct = 30;
    useAcademyUsageMock.mockReturnValue({
      data: buildMockPayload({ storageStatus: 'ok', storageUsagePct: usagePct }),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UsageSettingsPage />);

    expect(screen.queryByText('Storage limit reached — uploads are blocked')).not.toBeInTheDocument();
    expect(
      screen.queryByText(`${usagePct}% used — approaching storage limit`)
    ).not.toBeInTheDocument();
  });
});

