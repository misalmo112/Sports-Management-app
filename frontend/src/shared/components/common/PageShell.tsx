/**
 * Page shell for consistent dashboard layouts.
 */
import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

interface PageShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageShell({ title, subtitle, actions, children, className }: PageShellProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Dashboard Section
          </p>
          <h2 className="text-3xl font-semibold">{title}</h2>
          {subtitle ? (
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <div className="grid gap-6">{children}</div>
    </div>
  );
}
