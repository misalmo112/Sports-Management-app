import type { ComponentType } from 'react';
import { HardDrive, Shield, Users, CalendarRange } from 'lucide-react';

import { EmptyState } from '@/shared/components/common/EmptyState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { PageShell } from '@/shared/components/common/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Progress } from '@/shared/components/ui/progress';
import { useAcademyUsage } from '../hooks/hooks';

export const UsageSettingsPage = () => {
  const { data, isLoading, error, refetch } = useAcademyUsage();

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState message="Loading usage and limits..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load usage and limits"
        />
      </div>
    );
  }

  if (!data?.quota) {
    return (
      <div className="container mx-auto py-8">
        <PageShell
          title="Usage & Limits"
          subtitle="Monitor the academy’s current usage against effective plan limits."
        >
          <EmptyState
            title="No quota data available"
            description="This academy does not have effective quota limits yet."
          />
        </PageShell>
      </div>
    );
  }

  const { quota, usage } = data;
  const storageStatus = usage.storage_status ?? 'ok';
  const totalUsagePct =
    typeof usage.storage_usage_pct === 'number'
      ? usage.storage_usage_pct
      : toPercentage(usage.total_used_bytes, quota.storage_bytes_limit);
  const mediaUsagePct = toPercentage(usage.storage_used_bytes, quota.storage_bytes_limit);
  const dbUsagePct = toPercentage(usage.db_size_bytes, quota.storage_bytes_limit);

  const metrics = [
    {
      key: 'students',
      title: 'Students',
      used: usage.students_count,
      limit: quota.max_students,
      icon: Users,
    },
    {
      key: 'coaches',
      title: 'Coaches',
      used: usage.coaches_count,
      limit: quota.max_coaches,
      icon: Users,
    },
    {
      key: 'admins',
      title: 'Admins',
      used: usage.admins_count,
      limit: quota.max_admins,
      icon: Shield,
    },
    {
      key: 'classes',
      title: 'Classes',
      used: usage.classes_count,
      limit: quota.max_classes,
      icon: CalendarRange,
    },
  ];

  return (
    <div className="container mx-auto py-8">
      <PageShell
        title="Usage & Limits"
        subtitle="Track usage against the academy’s effective plan limits. Values are read-only in this version."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <UsageMetricCard
              key={metric.key}
              title={metric.title}
              used={metric.used}
              limit={metric.limit}
              icon={metric.icon}
            />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle>Storage</CardTitle>
              <CardDescription>
                Storage combines tenant media usage and database footprint.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <StorageMetric
                label="Total Storage"
                used={usage.total_used_bytes}
                limit={quota.storage_bytes_limit}
                secondary={`${usage.total_used_gb.toFixed(2)} GB used`}
                storageStatus={storageStatus}
                usagePct={totalUsagePct}
              />
              <StorageMetric
                label="Media Files"
                used={usage.storage_used_bytes}
                limit={quota.storage_bytes_limit}
                secondary={`${usage.storage_used_gb.toFixed(2)} GB in uploads`}
                storageStatus="ok"
                usagePct={mediaUsagePct}
              />
              <StorageMetric
                label="Database Size"
                used={usage.db_size_bytes}
                limit={quota.storage_bytes_limit}
                secondary={`${usage.db_size_gb.toFixed(2)} GB in database records`}
                storageStatus="ok"
                usagePct={dbUsagePct}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>
                Effective limits currently applied to the academy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SummaryRow label="Student Limit" value={String(quota.max_students)} />
              <SummaryRow label="Coach Limit" value={String(quota.max_coaches)} />
              <SummaryRow label="Admin Limit" value={String(quota.max_admins)} />
              <SummaryRow label="Class Limit" value={String(quota.max_classes)} />
              <SummaryRow label="Storage Limit" value={formatBytes(quota.storage_bytes_limit)} />
              <SummaryRow
                label="Counts Last Computed"
                value={usage.counts_computed_at ? new Date(usage.counts_computed_at).toLocaleString() : 'Not available'}
              />
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </div>
  );
};

function UsageMetricCard({
  title,
  used,
  limit,
  icon: Icon,
}: {
  title: string;
  used: number;
  limit: number;
  icon: ComponentType<{ className?: string }>;
}) {
  const percentage = toPercentage(used, limit);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xl font-semibold">
          {used} / {limit}
        </div>
        <Progress value={percentage} />
        <p className="text-sm text-muted-foreground">{percentage}% of limit used</p>
      </CardContent>
    </Card>
  );
}

function StorageMetric({
  label,
  used,
  limit,
  secondary,
  storageStatus,
  usagePct,
}: {
  label: string;
  used: number;
  limit: number;
  secondary: string;
  storageStatus: 'unlimited' | 'ok' | 'warning' | 'exceeded';
  usagePct: number;
}) {
  const progressVariant = storageStatus === 'warning' ? 'warning' : storageStatus === 'exceeded' ? 'exceeded' : 'default';

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{secondary}</p>
        </div>
        <HardDrive className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>{formatBytes(used)}</span>
          <span className="text-muted-foreground">of {formatBytes(limit)}</span>
        </div>
        <Progress value={usagePct} variant={progressVariant} />
        {storageStatus === 'warning' ? (
          <div className="rounded-md bg-amber-50 px-2 py-1 text-sm text-amber-700">
            {usagePct}% used — approaching storage limit
          </div>
        ) : storageStatus === 'exceeded' ? (
          <div className="rounded-md bg-red-50 px-2 py-1 text-sm text-red-700">
            Storage limit reached — uploads are blocked
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}

function toPercentage(used: number, limit: number) {
  if (!limit || limit <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((used / limit) * 100));
}

function formatBytes(value: number) {
  if (!value) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}
