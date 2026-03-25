/**
 * Dashboard Layout Component
 * 
 * Provides the main layout structure for dashboard pages with sidebar navigation
 */

import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { cn } from '@/shared/utils/cn';
import { AcademySettingsProvider } from '@/shared/context/AcademySettingsContext';

interface DashboardLayoutProps {
  className?: string;
}

const SIDEBAR_COLLAPSED_KEY = 'dashboard-sidebar-collapsed';

export function DashboardLayout({ className }: DashboardLayoutProps) {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (storedValue === 'true') {
      setIsSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const pageTitle = location.pathname
    .split('/')
    .filter(Boolean)
    .slice(-1)[0]
    ?.replace(/-/g, ' ')
    ?.replace(/\b\w/g, char => char.toUpperCase());

  return (
    <AcademySettingsProvider>
      <div className={cn('flex min-h-screen overflow-hidden', className)}>
        <Sidebar
          collapsed={isSidebarCollapsed}
          onToggleCollapsed={() => setIsSidebarCollapsed((prev) => !prev)}
        />
        <main
          className={cn(
            'flex-1 overflow-y-auto transition-all',
            isSidebarCollapsed ? 'ml-20' : 'ml-72'
          )}
        >
          <div className="page-grid min-h-screen bg-background/80 px-6 py-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
              <TopBar title={pageTitle ?? 'Dashboard'} />
              <section className="fade-up">
                <Outlet />
              </section>
            </div>
          </div>
        </main>
      </div>
    </AcademySettingsProvider>
  );
}
