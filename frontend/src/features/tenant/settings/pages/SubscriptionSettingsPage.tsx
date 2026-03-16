import type { ComponentType } from 'react';
import { CalendarClock, CreditCard, Info } from 'lucide-react';

import { EmptyState } from '@/shared/components/common/EmptyState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { PageShell } from '@/shared/components/common/PageShell';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useAcademySubscription } from '../hooks/hooks';

export const SubscriptionSettingsPage = () => {
  const { data, isLoading, error, refetch } = useAcademySubscription();

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState message="Loading subscription details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load subscription details"
        />
      </div>
    );
  }

  const subscription = data?.current_subscription;

  if (!subscription) {
    return (
      <div className="container mx-auto py-8">
        <PageShell
          title="Subscription"
          subtitle="Review the academy’s active plan and billing context."
        >
          <EmptyState
            title="No active subscription"
            description="No current plan is attached to this academy yet."
          />
        </PageShell>
      </div>
    );
  }

  const plan = subscription.plan_details;

  return (
    <div className="container mx-auto py-8">
      <PageShell
        title="Subscription"
        subtitle="Read-only visibility into the academy’s active plan, status, and billing cadence."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Plan"
            value={plan.name}
            detail={plan.description || 'No plan description provided.'}
            icon={CreditCard}
          />
          <StatCard
            title="Status"
            value={subscription.status}
            detail={`Started ${formatDate(subscription.start_at)}`}
            icon={CalendarClock}
            badge={subscription.status}
          />
          <StatCard
            title="Trial"
            value={plan.trial_days > 0 ? `${plan.trial_days} days` : 'No trial'}
            detail={subscription.trial_ends_at ? `Ends ${formatDate(subscription.trial_ends_at)}` : 'Trial not active'}
            icon={Info}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Plan Details</CardTitle>
              <CardDescription>
                This plan is visible to the academy, but plan changes remain platform-managed in this version.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <DataPoint label="Plan Name" value={plan.name} />
              <DataPoint label="Plan Slug" value={plan.slug} />
              <DataPoint
                label="Monthly Price"
                value={formatPrice(plan.price_monthly, plan.currency)}
              />
              <DataPoint
                label="Yearly Price"
                value={formatPrice(plan.price_yearly, plan.currency)}
              />
              <DataPoint
                label="Seat-Based Pricing"
                value={plan.seat_based_pricing ? 'Enabled' : 'Not enabled'}
              />
              <DataPoint label="Overrides Applied" value={formatOverrides(subscription.overrides_json)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscription Timeline</CardTitle>
              <CardDescription>
                Important dates for the academy’s currently assigned subscription.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TimelineItem label="Start Date" value={formatDate(subscription.start_at)} />
              <TimelineItem label="End Date" value={formatDate(subscription.end_at)} />
              <TimelineItem label="Trial Ends" value={formatDate(subscription.trial_ends_at)} />
              <TimelineItem label="Canceled At" value={formatDate(subscription.canceled_at)} />
              <TimelineItem label="Cancel Reason" value={subscription.cancel_reason || 'Not canceled'} />
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </div>
  );
};

function StatCard({
  title,
  value,
  detail,
  icon: Icon,
  badge,
}: {
  title: string;
  value: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {badge ? <Badge className="mt-2">{badge}</Badge> : null}
        </div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold">{value}</div>
        <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatPrice(value: string | null, currency: string) {
  if (!value) {
    return 'Not set';
  }

  return `${value} ${currency}`;
}

function formatOverrides(overrides: Record<string, number>) {
  const entries = Object.entries(overrides || {});
  if (entries.length === 0) {
    return 'No quota overrides';
  }

  return entries.map(([key, value]) => `${key}: ${value}`).join(', ');
}
