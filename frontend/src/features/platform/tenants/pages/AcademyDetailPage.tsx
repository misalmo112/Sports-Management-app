/**
 * Academy Detail Page (Platform - SUPERADMIN)
 * View academy details
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Switch } from '@/shared/components/ui/switch';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Settings,
  Link2,
  Copy,
  RefreshCw,
  AlertCircle,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import {
  useAcademy,
  useAcademyInviteLink,
  useExportAcademy,
  useAcademyWhatsappConfig,
  useUpdateAcademyWhatsappConfig,
  useTestSendAcademyWhatsapp,
  useAcademyNotificationLogs,
} from '../hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { extractValidationErrors, formatErrorMessage } from '@/shared/utils/errorUtils';

export const AcademyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: academy, isLoading, error } = useAcademy(id);
  const inviteMutation = useAcademyInviteLink();
  const exportMutation = useExportAcademy();
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  // WhatsApp config (platform superadmin)
  const {
    data: whatsappConfig,
    isLoading: isWhatsAppConfigLoading,
    error: whatsappConfigError,
  } = useAcademyWhatsappConfig(id);
  const updateWhatsappConfigMutation = useUpdateAcademyWhatsappConfig(id);
  const testSendWhatsappMutation = useTestSendAcademyWhatsapp(id);

  const [showWhatsAppIntegration, setShowWhatsAppIntegration] = useState(true);
  const defaultWaForm = {
    is_enabled: false,
    send_on_invoice_created: true,
    send_on_receipt_created: true,
    phone_number_id: '',
    access_token: '',
    waba_id: '',
    invoice_template_name: 'academy_invoice_created',
    receipt_template_name: 'academy_receipt_issued',
    template_language: 'en',
  };
  const [waForm, setWaForm] = useState(defaultWaForm);

  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [waNotice, setWaNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Notification logs (platform superadmin)
  const [notificationLogChannel, setNotificationLogChannel] = useState<'__all__' | string>('__all__');
  const [notificationLogStatus, setNotificationLogStatus] = useState<'__all__' | string>('__all__');
  const [notificationLogDocType, setNotificationLogDocType] = useState<'__all__' | string>('__all__');
  const [notificationLogPage, setNotificationLogPage] = useState(1);
  const pageSize = 20;

  const {
    data: notificationLogsData,
    isLoading: isNotificationLogsLoading,
    error: notificationLogsError,
    refetch: refetchNotificationLogs,
  } = useAcademyNotificationLogs(id, {
    channel: notificationLogChannel === '__all__' ? undefined : (notificationLogChannel as any),
    status: notificationLogStatus === '__all__' ? undefined : (notificationLogStatus as any),
    doc_type: notificationLogDocType === '__all__' ? undefined : (notificationLogDocType as any),
    page: notificationLogPage,
  });

  useEffect(() => {
    // Pre-fill test phone from academy when possible.
    if (!testPhoneNumber && academy?.phone) {
      setTestPhoneNumber(academy.phone);
    }
  }, [academy?.phone, testPhoneNumber]);

  useEffect(() => {
    if (isWhatsAppConfigLoading) return;
    if (!whatsappConfig) {
      setWaForm(defaultWaForm);
      return;
    }
    setWaForm({
      is_enabled: whatsappConfig.is_enabled,
      send_on_invoice_created: whatsappConfig.send_on_invoice_created,
      send_on_receipt_created: whatsappConfig.send_on_receipt_created,
      phone_number_id: whatsappConfig.phone_number_id || '',
      access_token: '',
      waba_id: whatsappConfig.waba_id || '',
      invoice_template_name: whatsappConfig.invoice_template_name || 'academy_invoice_created',
      receipt_template_name: whatsappConfig.receipt_template_name || 'academy_receipt_issued',
      template_language: whatsappConfig.template_language || 'en',
    });
  }, [whatsappConfig, isWhatsAppConfigLoading]);
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
  const storageStatus = academy?.usage?.storage_status;

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
            onClick={() => id && exportMutation.mutate(id)}
            disabled={exportMutation.isPending}
          >
            <Download className="mr-2 h-4 w-4" />
            {exportMutation.isPending ? 'Exporting...' : 'Export data'}
          </Button>
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
              <div className="flex items-center gap-2">
                <Label className="text-muted-foreground">Total Used</Label>
                {storageStatus === 'warning' ? (
                  <Badge
                    variant="outline"
                    className="border-amber-500 bg-amber-50 text-amber-700"
                  >
                    Warning
                  </Badge>
                ) : storageStatus === 'exceeded' ? (
                  <Badge
                    variant="outline"
                    className="border-red-500 bg-red-50 text-red-700"
                  >
                    Exceeded
                  </Badge>
                ) : null}
              </div>
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

        {/* WhatsApp Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>WhatsApp Integration</CardTitle>
                <CardDescription>Configure WhatsApp Business API credentials and templates.</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWhatsAppIntegration((v) => !v)}
                className="shrink-0"
              >
                <ChevronDown className={showWhatsAppIntegration ? 'h-4 w-4' : 'h-4 w-4 rotate-180 transition-transform'} />
              </Button>
            </div>
          </CardHeader>
          {showWhatsAppIntegration ? (
            <CardContent className="space-y-4">
              {waNotice ? (
                <Alert variant={waNotice.type === 'success' ? 'default' : 'destructive'}>
                  <AlertDescription>{waNotice.message}</AlertDescription>
                </Alert>
              ) : null}

              {whatsappConfigError ? (
                <ErrorState
                  error={whatsappConfigError}
                  onRetry={() => window.location.reload()}
                  title="Failed to load WhatsApp config"
                />
              ) : null}

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label>Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle WhatsApp dispatch for invoice/receipt events.
                  </p>
                </div>
                <Switch
                  checked={waForm.is_enabled}
                  onCheckedChange={(checked) => setWaForm((prev) => ({ ...prev, is_enabled: checked }))}
                  disabled={isWhatsAppConfigLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone_number_id">Phone Number ID</Label>
                  <Input
                    id="phone_number_id"
                    value={waForm.phone_number_id}
                    onChange={(e) => setWaForm((prev) => ({ ...prev, phone_number_id: e.target.value }))}
                    placeholder="e.g. 1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="access_token">Access Token</Label>
                    {whatsappConfig?.verified ? (
                      <Badge variant="default">Verified</Badge>
                    ) : (
                      <Badge variant="secondary">Not Verified</Badge>
                    )}
                  </div>
                  <Input
                    id="access_token"
                    type="password"
                    value={waForm.access_token}
                    onChange={(e) => setWaForm((prev) => ({ ...prev, access_token: e.target.value }))}
                    placeholder="********"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep the existing encrypted token.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="waba_id">WABA ID</Label>
                  <Input
                    id="waba_id"
                    value={waForm.waba_id}
                    onChange={(e) => setWaForm((prev) => ({ ...prev, waba_id: e.target.value }))}
                    placeholder="e.g. waba_id"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template_language">Template Language</Label>
                  <Input
                    id="template_language"
                    value={waForm.template_language}
                    onChange={(e) => setWaForm((prev) => ({ ...prev, template_language: e.target.value }))}
                    placeholder="e.g. en"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice_template_name">Invoice Template Name</Label>
                  <Input
                    id="invoice_template_name"
                    value={waForm.invoice_template_name}
                    onChange={(e) =>
                      setWaForm((prev) => ({ ...prev, invoice_template_name: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receipt_template_name">Receipt Template Name</Label>
                  <Input
                    id="receipt_template_name"
                    value={waForm.receipt_template_name}
                    onChange={(e) =>
                      setWaForm((prev) => ({ ...prev, receipt_template_name: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="send_on_invoice_created">Send on Invoice Created</Label>
                    <Switch
                      id="send_on_invoice_created"
                      checked={waForm.send_on_invoice_created}
                      onCheckedChange={(checked) =>
                        setWaForm((prev) => ({ ...prev, send_on_invoice_created: checked }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="send_on_receipt_created">Send on Receipt Created</Label>
                    <Switch
                      id="send_on_receipt_created"
                      checked={waForm.send_on_receipt_created}
                      onCheckedChange={(checked) =>
                        setWaForm((prev) => ({ ...prev, send_on_receipt_created: checked }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="test_phone">Test phone number</Label>
                    <Input
                      id="test_phone"
                      value={testPhoneNumber}
                      onChange={(e) => setTestPhoneNumber(e.target.value)}
                      placeholder="+971501234567"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!id) return;
                      setWaNotice(null);
                      try {
                        await testSendWhatsappMutation.mutateAsync({
                          phone_number: testPhoneNumber,
                        });
                        setWaNotice({ type: 'success', message: 'Test message accepted.' });
                        refetchNotificationLogs();
                      } catch (err: any) {
                        const validation = extractValidationErrors(err);
                        const detail = validation?.non_field_errors?.[0] || formatErrorMessage(err);
                        setWaNotice({ type: 'error', message: detail });
                      }
                    }}
                    disabled={testSendWhatsappMutation.isPending || !testPhoneNumber}
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Send Test Message
                  </Button>
                </div>

                <Button
                  onClick={async () => {
                    if (!id) return;
                    setWaNotice(null);
                    try {
                      await updateWhatsappConfigMutation.mutateAsync({
                        ...waForm,
                        access_token: waForm.access_token ?? '',
                      });
                      setWaNotice({ type: 'success', message: 'WhatsApp configuration saved successfully.' });
                    } catch (err: any) {
                      const validation = extractValidationErrors(err);
                      const detail = validation?.non_field_errors?.[0] || formatErrorMessage(err);
                      setWaNotice({ type: 'error', message: detail });
                    }
                  }}
                  disabled={updateWhatsappConfigMutation.isPending}
                >
                  {updateWhatsappConfigMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </CardContent>
          ) : null}
        </Card>

        {/* Notification Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Logs</CardTitle>
            <CardDescription>Track WhatsApp delivery attempts (with filtering and pagination).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1 space-y-2">
                <Label>Channel</Label>
                <Select
                  value={notificationLogChannel}
                  onValueChange={(v) => {
                    setNotificationLogChannel(v);
                    setNotificationLogPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 space-y-2">
                <Label>Status</Label>
                <Select
                  value={notificationLogStatus}
                  onValueChange={(v) => {
                    setNotificationLogStatus(v);
                    setNotificationLogPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All</SelectItem>
                    <SelectItem value="SENT">Sent</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                    <SelectItem value="SKIPPED">Skipped</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 space-y-2">
                <Label>Doc Type</Label>
                <Select
                  value={notificationLogDocType}
                  onValueChange={(v) => {
                    setNotificationLogDocType(v);
                    setNotificationLogPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by doc type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All</SelectItem>
                    <SelectItem value="INVOICE">Invoice</SelectItem>
                    <SelectItem value="RECEIPT">Receipt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {notificationLogsError ? (
              <ErrorState
                error={notificationLogsError}
                onRetry={() => refetchNotificationLogs()}
                title="Failed to load notification logs"
              />
            ) : isNotificationLogsLoading ? (
              <LoadingState message="Loading notification logs..." />
            ) : notificationLogsData?.results && notificationLogsData.results.length > 0 ? (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Channel</TableHead>
                        <TableHead>Doc Type</TableHead>
                        <TableHead>Object ID</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent At</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notificationLogsData.results.map((log) => (
                        <TableRow key={`${log.channel}-${log.doc_type}-${log.object_id}-${log.sent_at}`}>
                          <TableCell>
                            {log.channel === 'WHATSAPP' ? (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                WhatsApp
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                Email
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{log.doc_type}</TableCell>
                          <TableCell className="font-mono text-xs">{log.object_id}</TableCell>
                          <TableCell>{log.recipient}</TableCell>
                          <TableCell>
                            {log.status === 'SENT' ? (
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                Sent
                              </span>
                            ) : log.status === 'FAILED' ? (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                                Failed
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                                Skipped
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              try {
                                return new Date(log.sent_at).toLocaleString();
                              } catch {
                                return log.sent_at;
                              }
                            })()}
                          </TableCell>
                          <TableCell className="max-w-[320px] truncate">
                            {log.error_detail ? log.error_detail : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {notificationLogsData.count > pageSize ? (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {(notificationLogPage - 1) * pageSize + 1} to{' '}
                      {Math.min(notificationLogPage * pageSize, notificationLogsData.count)} of{' '}
                      {notificationLogsData.count} logs
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNotificationLogPage((p) => Math.max(1, p - 1))}
                        disabled={!notificationLogsData.previous || notificationLogPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <div className="flex items-center px-2 text-sm text-muted-foreground">
                        Page {notificationLogPage} of {Math.ceil(notificationLogsData.count / pageSize)}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNotificationLogPage((p) => p + 1)}
                        disabled={!notificationLogsData.next}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyState
                title="No notification logs found"
                description="There are no delivery attempts matching your filters."
              />
            )}
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

