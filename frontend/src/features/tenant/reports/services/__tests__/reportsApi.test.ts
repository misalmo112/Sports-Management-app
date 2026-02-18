import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/shared/services/api';
import { getReport } from '../reportsApi';

vi.mock('@/shared/services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('reportsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: { type: 'academy_financials', summary: {} } } as any);
  });

  it('builds academy financials report query with location/date filters', async () => {
    await getReport({
      report_type: 'academy_financials',
      date_from: '2026-01-01',
      date_to: '2026-01-31',
      location_id: 12,
    });

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    const calledUrl = vi.mocked(apiClient.get).mock.calls[0][0] as string;
    expect(calledUrl).toContain('/api/v1/tenant/reports/?');
    expect(calledUrl).toContain('report_type=academy_financials');
    expect(calledUrl).toContain('date_from=2026-01-01');
    expect(calledUrl).toContain('date_to=2026-01-31');
    expect(calledUrl).toContain('location_id=12');
  });
});
