/**
 * Academy Detail Page (Platform - SUPERADMIN)
 * View academy details
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Settings, Link2, Copy, RefreshCw, AlertCircle } from 'lucide-react';
import { useAcademy, useAcademyInviteLink } from '../hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';

export const AcademyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: academy, isLoading, error } = useAcademy(id);
  const inviteMutation = useAcademyInviteLink();
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const inviteErrorResponse = (inviteMutation.error as any)?.response?.data;
  const inviteError =
    inviteErrorResponse?.detail ||
    (inviteErrorResponse
      ? JSON.stringify(inviteErrorResponse)
      : (inviteMutation.error as any)?.message) ||
    'Failed to generate invite link.';

  const handleGenerateInvite = async (force = false) => {
    setCopied(false);
    if (!id) return;
    try {
      await inviteMutation.mutateAsync({
        id,
        data: {
          email: inviteEmail.trim() || undefined,
          force,
        },
      });
    } catch {
      const detail = (inviteMutation.error as any)?.response?.data?.detail;
      if (!force && detail === 'Admin user is already active.') {
        await inviteMutation.mutateAsync({
          id,
          data: {
            email: inviteEmail.trim() || undefined,
            force: true,
          },
        });
      }
    }
  };

  const handleCopy = async () => {
    if (!inviteMutation.data?.invite_url) return;
    try {
      await navigator.clipboard.writeText(inviteMutation.data.invite_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const formatNumber = (value?: number | null) => {
    if (value === undefined || value === null) return 'N/A';
    return value.toLocaleString();
  };

  const formatBytes = (bytes?: number | null) => {
    if (bytes === undefined || bytes === null) return 'N/A';
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const formatOverrides = (overrides?: Record<string, number> | null) => {
    if (!overrides || Object.keys(overrides).length === 0) return 'None';
    return Object.entries(overrides)
      .map(([key, value]) => {
        if (key === 'storage_bytes') {
          return `${key}: ${formatBytes(value)}`;
        }
        return `${key}: ${formatNumber(value)}`;
      })
      .join(', ');
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return '—';
    }
  };
  const usedStorageBytes = academy?.usage?.storage_used_bytes ?? 0;
  const dbSizeBytes = academy?.usage?.db_size_bytes ?? 0;
  const totalUsedBytes = academy?.usage?.total_used_bytes ?? usedStorageBytes + dbSizeBytes;
  const storageLimitBytes = academy?.quota?.storage_bytes_limit ?? 0;
  const remainingStorageBytes =
    storageLimitBytes > 0 ? Math.max(storageLimitBytes - totalUsedBytes, 0) : null;
  const usagePercent =
    storageLimitBytes > 0
      ? Math.min(100, (totalUsedBytes / storageLimitBytes) * 100)
      : null;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState message="Loading academy..." />
      </div>
    );
  }

  if (error || !academy) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={error || new Error('Academy not found')}
          onRetry={() => window.location.reload()}
          title="Failed to load academy"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/dashboard/platform/academies')}>
          ← Back to Academies
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/platform/academies/${id}/plan`)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Update Plan
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/platform/academies/${id}/quota`)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Update Quota
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{academy.name}</CardTitle>
                <CardDescription className="mt-1">Academy Details</CardDescription>
              </div>
              <div className="flex gap-2">
                {academy.is_active ? (
                  <Badge variant="default">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
                {academy.onboarding_completed ? (
                  <Badge variant="outline">Onboarding Complete</Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    Onboarding Pending
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Academy Name</Label>
              <p className="text-lg font-medium">{academy.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Slug</Label>
              <p className="text-lg font-medium">{academy.slug}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="text-lg font-medium">{academy.email || '—'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Phone</Label>
              <p className="text-lg font-medium">{academy.phone || '—'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Website</Label>
              <p className="text-lg font-medium">
                {academy.website ? (
                  <a
                    href={academy.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {academy.website}
                  </a>
                ) : (
                  '—'
                )}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Timezone</Label>
              <p className="text-lg font-medium">{academy.timezone || 'UTC'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        {(academy.address_line1 ||
          academy.city ||
          academy.state ||
          academy.postal_code ||
          academy.country) && (
          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {academy.address_line1 && (
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Address Line 1</Label>
                  <p className="text-lg font-medium">{academy.address_line1}</p>
                </div>
              )}
              {academy.address_line2 && (
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Address Line 2</Label>
                  <p className="text-lg font-medium">{academy.address_line2}</p>
                </div>
              )}
              {academy.city && (
                <div>
                  <Label className="text-muted-foreground">City</Label>
                  <p className="text-lg font-medium">{academy.city}</p>
                </div>
              )}
              {academy.state && (
                <div>
                  <Label className="text-muted-foreground">State/Province</Label>
                  <p className="text-lg font-medium">{academy.state}</p>
                </div>
              )}
              {academy.postal_code && (
                <div>
                  <Label className="text-muted-foreground">Postal Code</Label>
                  <p className="text-lg font-medium">{academy.postal_code}</p>
                </div>
              )}
              {academy.country && (
                <div>
                  <Label className="text-muted-foreground">Country</Label>
                  <p className="text-lg font-medium">{academy.country}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Status & Timestamps */}
        <Card>
          <CardHeader>
            <CardTitle>Status & Timestamps</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <div className="text-lg font-medium">
                {academy.is_active ? (
                  <Badge variant="default">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Onboarding Status</Label>
              <div className="text-lg font-medium">
                {academy.onboarding_completed ? (
                  <Badge variant="outline">Completed</Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    Pending
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Created At</Label>
              <p className="text-lg font-medium">{formatDateTime(academy.created_at)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Last Updated</Label>
              <p className="text-lg font-medium">{formatDateTime(academy.updated_at)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Current plan status and overrides.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Plan</Label>
              <p className="text-lg font-medium">
                {academy.current_subscription?.plan_name || 'No active subscription'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <p className="text-lg font-medium">
                {academy.current_subscription?.status || 'N/A'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Start At</Label>
              <p className="text-lg font-medium">
                {academy.current_subscription?.start_at
                  ? formatDateTime(academy.current_subscription.start_at)
                  : 'N/A'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">End At</Label>
              <p className="text-lg font-medium">
                {academy.current_subscription?.end_at
                  ? formatDateTime(academy.current_subscription.end_at)
                  : 'N/A'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Trial Ends</Label>
              <p className="text-lg font-medium">
                {academy.current_subscription?.trial_ends_at
                  ? formatDateTime(academy.current_subscription.trial_ends_at)
                  : 'N/A'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Current</Label>
              <p className="text-lg font-medium">
                {academy.current_subscription
                  ? academy.current_subscription.is_current
                    ? 'Yes'
                    : 'No'
                  : 'N/A'}
              </p>
            </div>
            <div className="col-span-2">
              <Label className="text-muted-foreground">Overrides</Label>
              <p className="text-sm text-muted-foreground">
                {formatOverrides(academy.current_subscription?.overrides_json)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Storage Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Usage</CardTitle>
            <CardDescription>Current storage consumption and quota.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Media Storage Used</Label>
              <p className="text-lg font-medium">{formatBytes(usedStorageBytes)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Database Size</Label>
              <p className="text-lg font-medium">{formatBytes(dbSizeBytes)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Total Used</Label>
              <p className="text-lg font-medium">{formatBytes(totalUsedBytes)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Storage Limit</Label>
              <p className="text-lg font-medium">
                {storageLimitBytes ? formatBytes(storageLimitBytes) : 'No quota set'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Remaining</Label>
              <p className="text-lg font-medium">
                {remainingStorageBytes === null
                  ? 'N/A'
                  : formatBytes(remainingStorageBytes)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Usage</Label>
              <p className="text-lg font-medium">
                {usagePercent === null ? 'N/A' : `${usagePercent.toFixed(1)}%`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quota */}
        <Card>
          <CardHeader>
            <CardTitle>Quota</CardTitle>
            <CardDescription>Effective limits applied to this academy.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Storage Limit</Label>
              <p className="text-lg font-medium">
                {formatBytes(academy.quota?.storage_bytes_limit)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Max Students</Label>
              <p className="text-lg font-medium">
                {formatNumber(academy.quota?.max_students)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Max Coaches</Label>
              <p className="text-lg font-medium">
                {formatNumber(academy.quota?.max_coaches)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Max Admins</Label>
              <p className="text-lg font-medium">
                {formatNumber(academy.quota?.max_admins)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Max Classes</Label>
              <p className="text-lg font-medium">
                {formatNumber(academy.quota?.max_classes)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Quota Updated</Label>
              <p className="text-lg font-medium">
                {academy.quota?.updated_at ? formatDateTime(academy.quota.updated_at) : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Invitation Link */}
        <Card>
          <CardHeader>
            <CardTitle>Invitation Link</CardTitle>
            <CardDescription>
              Generate a fresh invite for the academy admin to complete setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <div>
                <Label className="text-muted-foreground">Invite Email (optional)</Label>
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={academy.email || 'owner@example.com'}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={() => handleGenerateInvite(false)} disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-4 w-4" />
                      Generate Invite
                    </>
                  )}
                </Button>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => handleGenerateInvite(true)}
                  disabled={inviteMutation.isPending}
                >
                  Force Re-Invite
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {inviteMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  Invite ready
                </>
              )}
              {inviteMutation.data?.invite_url ? (
                <Button variant="outline" onClick={handleCopy}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? 'Copied' : 'Copy Link'}
                </Button>
              ) : null}
            </div>

            {inviteMutation.data?.invite_url ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Invite URL</Label>
                  <Input value={inviteMutation.data.invite_url} readOnly />
                </div>
                <div>
                  <Label className="text-muted-foreground">Invite Email</Label>
                  <Input value={inviteMutation.data.email} readOnly />
                </div>
                <div>
                  <Label className="text-muted-foreground">Role</Label>
                  <Input value={inviteMutation.data.role} readOnly />
                </div>
                <div>
                  <Label className="text-muted-foreground">Expires In (hours)</Label>
                  <Input value={String(inviteMutation.data.expires_in_hours)} readOnly />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No invite generated yet. Use the button above to create one.
              </p>
            )}

            {inviteMutation.error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {inviteError}
                </AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

