/**
 * Academy settings context (timezone/currency).
 */
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { AcademySettings } from '@/features/tenant/settings/types';
import { useAcademySettings } from '@/features/tenant/settings/hooks/hooks';

interface AcademySettingsContextValue {
  settings: AcademySettings | null;
  isLoading: boolean;
  error: Error | null;
}

const AcademySettingsContext = createContext<AcademySettingsContextValue>({
  settings: null,
  isLoading: false,
  error: null,
});

export const AcademySettingsProvider = ({ children }: { children: ReactNode }) => {
  const role = localStorage.getItem('user_role');
  const academyId = localStorage.getItem('selected_academy_id');
  const enabled = Boolean(academyId) && role !== 'SUPERADMIN';

  const { data, isLoading, error } = useAcademySettings({ enabled });

  return (
    <AcademySettingsContext.Provider
      value={{
        settings: data ?? null,
        isLoading,
        error: (error as Error) ?? null,
      }}
    >
      {children}
    </AcademySettingsContext.Provider>
  );
};

export const useAcademySettingsContext = () => {
  return useContext(AcademySettingsContext);
};
