/**
 * Sidebar navigation component
 * 
 * Displays role-based navigation menu with collapsible groups and active route highlighting
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/shared/utils/cn';
import { getNavigationForRole, isRouteActive } from '@/shared/nav/navigation';
import { getCurrentUserRole } from '@/shared/utils/roleAccess';
import apiClient from '@/shared/services/api';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const userRole = getCurrentUserRole();
  const navigationGroups = getNavigationForRole(userRole);

  const hasInvoiceSchedulesNav = navigationGroups.some((g) =>
    g.items.some((i) => i.id === 'invoice-schedules')
  );
  const hasStaffPaySchedulesNav = navigationGroups.some((g) =>
    g.items.some((i) => i.path === '/dashboard/operations/staff-pay-schedules')
  );

  const { data: pendingApprovalsCount } = useQuery<number, Error>({
    queryKey: ['pending-approvals', 'count'],
    enabled: hasInvoiceSchedulesNav,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/tenant/pending-approvals/?page_size=1');
      const payload = res.data;

      if (Array.isArray(payload)) return payload.length;
      if (typeof payload?.count === 'number') return payload.count;
      if (Array.isArray(payload?.results)) return payload.results.length;
      return 0;
    },
  });

  const { data: staffPendingApprovalsCount } = useQuery<number, Error>({
    queryKey: ['staff-pending-approvals', 'count'],
    enabled: hasStaffPaySchedulesNav,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/tenant/staff/pending-approvals/?page_size=1');
      const payload = res.data;

      if (Array.isArray(payload)) return payload.length;
      if (typeof payload?.count === 'number') return payload.count;
      if (Array.isArray(payload?.results)) return payload.results.length;
      return 0;
    },
  });

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(navigationGroups.map(g => g.id)) // All groups expanded by default
  );

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  if (!userRole || navigationGroups.length === 0) {
    return null;
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-30 w-72 h-screen border-r border-border/70 bg-background/80 backdrop-blur flex flex-col',
        className
      )}
    >
      <div className="p-6 border-b border-border/70">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-semibold shadow">
            SA
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
              Sports Academy
            </p>
            <h2 className="text-lg font-semibold">Control Desk</h2>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto p-5 space-y-3">
        {navigationGroups.map(group => {
          const isExpanded = expandedGroups.has(group.id);
          const hasActiveItem = group.items.some(item =>
            isRouteActive(location.pathname, item)
          );

          return (
            <div key={group.id} className="space-y-1">
              {group.label && (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors rounded-xl',
                    hasActiveItem && 'text-foreground'
                  )}
                >
                  <span>{group.label}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
              
              {isExpanded && (
                <div className="space-y-1 ml-2">
                  {group.items.map(item => {
                    const isActive = isRouteActive(location.pathname, item);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.id}
                        to={item.path}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground font-medium shadow'
                            : 'text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground'
                        )}
                      >
                        {Icon && <Icon className="h-4 w-4" />}
                        <span>{item.label}</span>
                        {item.id === 'invoice-schedules' && (pendingApprovalsCount ?? 0) > 0 ? (
                          <Badge
                            variant="destructive"
                            className="ml-auto"
                          >
                            {pendingApprovalsCount! > 99 ? '99+' : pendingApprovalsCount}
                          </Badge>
                        ) : null}
                        {item.path === '/dashboard/operations/staff-pay-schedules' && (staffPendingApprovalsCount ?? 0) > 0 ? (
                          <Badge variant="destructive" className="ml-auto">
                            {staffPendingApprovalsCount! > 99 ? '99+' : staffPendingApprovalsCount}
                          </Badge>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
