/**
 * Stats Page (Platform - SUPERADMIN)
 * View platform statistics
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Building2, Users, CreditCard, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlatformStats } from '../hooks/usePlatformStats';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';

export const StatsPage = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = usePlatformStats();

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState fullPage message="Loading platform statistics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load platform statistics"
          fullPage
        />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const usageRows = data.per_academy_usage
    ? [...data.per_academy_usage].sort(
        (a, b) =>
          (b.storage_used_bytes + (b.db_size_bytes || 0)) -
          (a.storage_used_bytes + (a.db_size_bytes || 0))
      )
    : [];

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Platform Statistics</h1>
        <p className="text-muted-foreground mt-2">Overview of platform metrics and usage</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Academies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.academies.total}</div>
            <p className="text-xs text-muted-foreground">
              {data.academies.active} active, {data.academies.onboarded} onboarded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.subscriptions.total}</div>
            <p className="text-xs text-muted-foreground">
              {data.subscriptions.active} active, {data.subscriptions.trial} trial
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.usage.total_students + data.usage.total_coaches}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.usage.total_students} students, {data.usage.total_coaches} coaches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.usage.total_storage_gb} GB</div>
            <p className="text-xs text-muted-foreground">
              {data.usage.total_classes} classes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Academies</CardTitle>
            <CardDescription>Academy statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">{data.academies.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active</span>
                <span className="font-medium">{data.academies.active}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Onboarded</span>
                <span className="font-medium">{data.academies.onboarded}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recent (30 days)</span>
                <span className="font-medium">{data.academies.recent_30_days}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>Platform usage metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Students</span>
                <span className="font-medium">{data.usage.total_students}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Coaches</span>
                <span className="font-medium">{data.usage.total_coaches}</span>
              </div>
              {typeof data.usage.total_admins === 'number' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Admins</span>
                  <span className="font-medium">{data.usage.total_admins}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Classes</span>
                <span className="font-medium">{data.usage.total_classes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Storage Used</span>
                <span className="font-medium">{data.usage.total_storage_gb} GB</span>
              </div>
              {typeof data.usage.total_db_gb === 'number' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total DB Size (Academies)</span>
                  <span className="font-medium">{data.usage.total_db_gb} GB</span>
                </div>
              )}
              {typeof data.usage.platform_db_gb === 'number' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform DB Size</span>
                  <span className="font-medium">{data.usage.platform_db_gb} GB</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Academy Storage Usage</CardTitle>
          <CardDescription>Storage and usage breakdown by academy</CardDescription>
        </CardHeader>
        <CardContent>
          {usageRows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No academy usage data available yet.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Academy</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Coaches</TableHead>
                    <TableHead>Admins</TableHead>
                    <TableHead>Classes</TableHead>
                    <TableHead>Media (GB)</TableHead>
                    <TableHead>DB (GB)</TableHead>
                    <TableHead>Total (GB)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageRows.map((row) => (
                    <TableRow
                      key={row.academy_id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/dashboard/platform/academies/${row.academy_id}`)}
                    >
                      <TableCell>
                        <div className="font-medium">{row.academy_name}</div>
                        <div className="text-xs text-muted-foreground">{row.academy_email}</div>
                      </TableCell>
                      <TableCell>
                        {row.is_active ? 'Active' : 'Inactive'}
                      </TableCell>
                      <TableCell>{row.students_count}</TableCell>
                      <TableCell>{row.coaches_count}</TableCell>
                      <TableCell>{row.admins_count}</TableCell>
                      <TableCell>{row.classes_count}</TableCell>
                      <TableCell>{row.storage_used_gb}</TableCell>
                      <TableCell>{row.db_size_gb ?? 0}</TableCell>
                      <TableCell>
                        {(
                          row.storage_used_gb +
                          (row.db_size_gb ?? 0)
                        ).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 text-sm text-muted-foreground">
        Generated at: {new Date(data.generated_at).toLocaleString()}
      </div>
    </div>
  );
};
