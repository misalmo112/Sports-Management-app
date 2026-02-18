/**
 * Hook for fetching reports
 */
import { useQuery } from '@tanstack/react-query';
import { getReport } from '../services/reportsApi';
import type { Report, ReportType } from '../types';

export const useReports = (params: {
  report_type: ReportType;
  date_from?: string;
  date_to?: string;
  class_id?: number;
  student_id?: number;
  sport_id?: number;
  location_id?: number;
  coach_id?: number;
}) => {
  return useQuery<Report, Error>({
    queryKey: ['reports', params],
    queryFn: () => getReport(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};
