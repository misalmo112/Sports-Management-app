/**
 * Shown when a STAFF user opens a route for a module they were not granted.
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { formatTenantModuleLabel } from '@/shared/constants/moduleKeys';
import { getTenantDashboardHomePath } from '@/shared/nav/navigation';
import { getCurrentUserRole } from '@/shared/utils/roleAccess';
import { ShieldOff } from 'lucide-react';

export type ModuleAccessDeniedLocationState = {
  moduleKey?: string;
};

export const ModuleAccessDeniedPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as ModuleAccessDeniedLocationState;
  const moduleKey = state.moduleKey;
  const moduleLabel = moduleKey ? formatTenantModuleLabel(moduleKey) : null;

  const goHome = () => {
    navigate(getTenantDashboardHomePath(getCurrentUserRole()), { replace: true });
  };

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <Card className="w-full max-w-md border border-border/70 glass-panel rounded-3xl">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldOff className="h-5 w-5" />
            <p className="text-xs uppercase tracking-[0.2em]">Access</p>
          </div>
          <CardTitle className="text-2xl">You don&apos;t have access to this area</CardTitle>
          <CardDescription>
            {moduleLabel
              ? `Your account does not include the “${moduleLabel}” module. Contact an academy administrator if you need access.`
              : 'Your account does not include permission for this section. Contact an academy administrator if you need access.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button type="button" onClick={goHome}>
            Go to home
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/dashboard/settings/account', { replace: true })}>
            My account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
