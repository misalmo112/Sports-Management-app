/**
 * Top bar for dashboard pages.
 */
import { cn } from '@/shared/utils/cn';
import { getCurrentUserRole } from '@/shared/utils/roleAccess';
import { logout } from '@/shared/utils/auth';
import { LogOut } from 'lucide-react';

interface TopBarProps {
  className?: string;
  title?: string;
  subtitle?: string;
}

export function TopBar({ className, title, subtitle }: TopBarProps) {
  const role = getCurrentUserRole();

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
