import type { ComponentType } from 'react';
import { ArrowRight, Building2, CreditCard, KeyRound, Package2, ShieldCheck, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { PageShell } from '@/shared/components/common/PageShell';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useCurrentAccount, useAcademySettings, useAcademySubscription, useAcademyUsage } from '../hooks/hooks';

const operationsLinks = [
  { label: 'Locations', path: '/dashboard/settings/locations' },
  { label: 'Sports', path: '/dashboard/settings/sports' },
  { label: 'Age Categories', path: '/dashboard/settings/age-categories' },
  { label: 'Terms', path: '/dashboard/settings/terms' },
  { label: 'Pricing', path: '/dashboard/settings/pricing' },
];

export const SettingsHomePage = () => {
  const account = useCurrentAccount();
  const organization = useAcademySettings();
  const subscription = useAcademySubscription();
  const usage = useAcademyUsage();

  const isLoading = account.isLoading || organization.isLoading || subscription.isLoading || usage.isLoading;
  const error = account.error || organization.error || subscription.error || usage.error;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState message="Loading settings..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={error}
          onRetry={() => {
            account.refetch();
            organization.refetch();
            subscription.refetch();
            usage.refetch();
          }}
          title="Failed to load settings"
        />
      </div>
    );
  }

  const currentSubscription = subscription.data?.current_subscription;
  const usageSummary = usage.data?.usage;

  return (
    <div className="container mx-auto py-8">
      <PageShell
        title="Settings"
        subtitle="Manage personal access, academy profile details, subscription visibility, and operational setup from one place."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="My Account"
            description={account.data?.email || 'No login email'}
            eyebrow={account.data?.role || 'Account'}
            path="/dashboard/settings/account"
            icon={ShieldCheck}
          />
          <SummaryCard
            title="Organization"
            description={organization.data?.name || 'Academy profile'}
            eyebrow={organization.data?.email || 'Contact details'}
            path="/dashboard/settings/organization"
            icon={Building2}
          />
          <SummaryCard
            title="Subscription"
            description={currentSubscription?.plan_details.name || 'No active plan'}
            eyebrow={currentSubscription?.status || 'Plan status'}
            path="/dashboard/settings/subscription"
            icon={CreditCard}
          />
          <SummaryCard
            title="Usage & Limits"
            description={
              usageSummary
                ? `${usageSummary.students_count} students, ${usageSummary.classes_count} classes`
                : 'No usage data'
            }
            eyebrow="Quota visibility"
            path="/dashboard/settings/usage"
            icon={Package2}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Core Settings</CardTitle>
              <CardDescription>
                These pages cover personal credentials, academy identity, and read-only subscription context.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <QuickLink
                title="My Account"
                description="Change your login email, name, and password."
                path="/dashboard/settings/account"
                icon={KeyRound}
              />
              <QuickLink
                title="Organization"
                description="Update academy name, contact details, address, timezone, and currency."
                path="/dashboard/settings/organization"
                icon={Building2}
              />
              <QuickLink
                title="Subscription"
                description="Review your current plan, plan pricing, and subscription status."
                path="/dashboard/settings/subscription"
                icon={CreditCard}
              />
              <QuickLink
                title="Usage & Limits"
                description="Track active usage against plan limits for seats, classes, and storage."
                path="/dashboard/settings/usage"
                icon={Package2}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operations</CardTitle>
              <CardDescription>
                Existing operational setup remains separate and is grouped here for faster access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {operationsLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center justify-between rounded-xl border p-3 transition-colors hover:bg-accent/40"
                >
                  <span className="font-medium">{link.label}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
              <Link
                to="/dashboard/settings/bulk-actions"
                className="flex items-center justify-between rounded-xl border p-3 transition-colors hover:bg-accent/40"
              >
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Bulk Actions</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>At A Glance</CardTitle>
            <CardDescription>
              A lightweight summary of the academy account from the new settings APIs.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatLine label="Organization Email" value={organization.data?.email || 'Not set'} />
            <StatLine label="Timezone" value={organization.data?.timezone || 'Not set'} />
            <StatLine label="Currency" value={organization.data?.currency || 'Not set'} />
            <div className="space-y-2 rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Plan Status</p>
                <Badge variant="secondary">{currentSubscription?.status || 'Unavailable'}</Badge>
              </div>
              <p className="font-semibold">{currentSubscription?.plan_details.name || 'No active plan'}</p>
              <p className="text-sm text-muted-foreground">
                {usageSummary
                  ? `${usageSummary.total_used_gb.toFixed(2)} GB total storage used`
                  : 'Usage data unavailable'}
              </p>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    </div>
  );
};

interface SummaryCardProps {
  title: string;
  eyebrow: string;
  description: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
}

function SummaryCard({ title, eyebrow, description, path, icon: Icon }: SummaryCardProps) {
  return (
    <Link to={path}>
      <Card className="h-full transition-colors hover:bg-accent/30">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="rounded-xl border p-2">
              <Icon className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{eyebrow}</p>
            <CardTitle className="mt-2 text-xl">{title}</CardTitle>
            <CardDescription className="mt-2">{description}</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}

interface QuickLinkProps {
  title: string;
  description: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
}

function QuickLink({ title, description, path, icon: Icon }: QuickLinkProps) {
  return (
    <Link
      to={path}
      className="rounded-xl border p-4 transition-colors hover:bg-accent/40"
    >
      <div className="flex items-center justify-between">
        <div className="rounded-xl border p-2">
          <Icon className="h-4 w-4" />
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}
