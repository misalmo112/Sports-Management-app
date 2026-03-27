/**
 * Top bar for dashboard pages.
 */
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/shared/utils/cn';
import { getCurrentUserRole } from '@/shared/utils/roleAccess';
import { logout } from '@/shared/utils/auth';
import { ChevronRight, LogOut } from 'lucide-react';

interface TopBarProps {
  className?: string;
  title?: string;
  subtitle?: string;
}

export function TopBar({ className, title, subtitle }: TopBarProps) {
  const role = getCurrentUserRole();
  const location = useLocation();

  const rawSegments = location.pathname.split('/').filter(Boolean).slice(1);
  const labels: Record<string, string> = {
    academy: 'Academy',
    attendance: 'Attendance',
    classes: 'Classes',
    feedback: 'Feedback',
    finance: 'Finance',
    management: 'Management',
    media: 'Media',
    operations: 'Schedules',
    overview: 'Overview',
    platform: 'Platform',
    reports: 'Reports',
    settings: 'Settings',
    staff: 'Staff',
    students: 'Students',
    users: 'Users',
  };
  const breadcrumbs = rawSegments.flatMap((segment, index) => {
    if (/^\d+$/.test(segment)) return [];
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return [];
    if (index === 0 && ['admin', 'owner', 'coach', 'parent'].includes(segment)) return [];

    return [
      {
        label:
          labels[segment] ??
          segment.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
        path: `/dashboard/${rawSegments.slice(0, index + 1).join('/')}`,
      },
    ];
  });

  const handleLogout = () => {
    logout();
  };

  return (
    <header
      className={cn(
        'flex flex-wrap items-center justify-between gap-4 rounded-2xl px-6 py-4 glass-panel',
        className
      )}
    >
      <div>
        {breadcrumbs.length > 0 ? (
          <nav className="mb-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
            <Link to="/dashboard" className="transition-colors hover:text-foreground">
              Dashboard
            </Link>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;

              return (
                <span key={crumb.path} className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  {isLast ? (
                    <span className="text-foreground">{crumb.label}</span>
                  ) : (
                    <Link to={crumb.path} className="transition-colors hover:text-foreground">
                      {crumb.label}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>
        ) : null}
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {role ? `${role} Workspace` : 'Academy Workspace'}
        </p>
        <h1 className="text-2xl font-semibold text-foreground">
          {title ?? 'Dashboard'}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-background hover:border-destructive/50 hover:text-destructive"
          data-testid="logout"
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
