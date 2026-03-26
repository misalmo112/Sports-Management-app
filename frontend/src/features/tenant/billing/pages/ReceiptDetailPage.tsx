/**
 * Receipt Detail Page
 * View receipt details + notification delivery status.
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { CheckCircle2, ArrowLeft, Mail, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import type { NotificationLog, NotificationStatus } from '../types';
import { useReceipt } from '../hooks/hooks';
import {
  getReceiptNotificationLogs,
  previewReceiptPdf,
  resendReceiptNotifications,
} from '../services/api';

const formatNotificationBadge = (status: NotificationStatus | null | undefined) => {
  const normalized = status ?? 'SKIPPED';
  if (normalized === 'SENT') {
    return (
      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
        Sent ✓
      </Badge>
    );
  }
  if (normalized === 'FAILED') {
    return (
      <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">
        Failed ✗
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-muted text-muted-foreground">
      Skipped
    </Badge>
  );
};

export const ReceiptDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatCurrency, formatDateTime } = useAcademyFormat();
  const queryClient = useQueryClient();

  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const [previewToast, setPreviewToast] = useState<string | null>(null);

  const { data: receipt, isLoading, error, refetch } = useReceipt(id);

  const {
    data: notificationLogs,
    isLoading: notificationLogsLoading,
    error: notificationLogsError,
  } = useQuery<NotificationLog[], Error>({
    queryKey: ['receipt-notification-logs', id],
    queryFn: () => getReceiptNotificationLogs(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const resendMutation = useMutation({
    mutationFn: (receiptId: number | string) => resendReceiptNotifications(receiptId),
    onSuccess: () => {
      setNotificationToast('Notifications queued');
      setTimeout(() => setNotificationToast(null), 3000);
      queryClient.invalidateQueries({ queryKey: ['receipt-notification-logs', id] });
    },
  });

  const previewReceiptMutation = useMutation({
    mutationFn: () => {
      const receiptId = receipt?.id ?? id;
      if (!receiptId) {
        throw new Error('Receipt id is missing');
      }
      return previewReceiptPdf(receiptId);
    },
    onSuccess: (data) => {
      if (data?.preview_url) {
        window.open(data.preview_url, '_blank', 'noopener,noreferrer');
      }
    },
    onError: () => {
      setPreviewToast('Failed to preview receipt PDF');
      setTimeout(() => setPreviewToast(null), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingState message="Loading receipt..." />
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="container mx-auto py-8">
        <ErrorState
          error={error || new Error('Receipt not found')}
          onRetry={() => refetch()}
          title="Failed to load receipt"
        />
      </div>
    );
  }

  const emailLog = notificationLogs?.find((l) => l.channel === 'EMAIL');
  const whatsappLog = notificationLogs?.find((l) => l.channel === 'WHATSAPP');
  const showWhatsappRow = receipt.notification_summary?.whatsapp != null;

  return (
    <div className="container mx-auto py-8">
      {notificationToast && (
        <Alert className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{notificationToast}</AlertDescription>
        </Alert>
      )}

      {previewToast && (
        <Alert className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{previewToast}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/dashboard/finance/receipts')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Receipts
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start gap-4">
              <div>
                <CardTitle className="text-2xl">{receipt.receipt_number}</CardTitle>
                <CardDescription className="mt-2">
                  Created: {formatDateTime(receipt.created_at)}
                </CardDescription>
              </div>
              <Badge variant="default" className="text-lg px-4 py-2">
                {formatCurrency(receipt.amount)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Invoice</h3>
                <p className="font-medium">{receipt.invoice_number}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Payment Date</h3>
                <p className="text-sm">
                  {receipt.payment_date ? formatDateTime(receipt.payment_date) : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Per-channel delivery status for this receipt</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Payment link:</span> No payment link
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => previewReceiptMutation.mutate()}
                  disabled={previewReceiptMutation.isPending || !receipt?.id}
                >
                  Preview PDF
                </Button>
                <Button
                  onClick={() => resendMutation.mutate(receipt.id)}
                  disabled={resendMutation.isPending || !receipt?.id}
                >
                  {resendMutation.isPending ? 'Queueing...' : 'Resend Notifications'}
                </Button>
              </div>
            </div>

            {notificationLogsLoading ? (
              <LoadingState message="Loading notification logs..." />
            ) : notificationLogsError ? (
              <ErrorState
                error={notificationLogsError}
                onRetry={() =>
                  queryClient.invalidateQueries({ queryKey: ['receipt-notification-logs', id] })
                }
                title="Failed to load notification logs"
              />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          Email
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatNotificationBadge(
                          emailLog?.status ?? receipt.notification_summary?.email ?? null
                        )}
                      </TableCell>
                      <TableCell>
                        {emailLog?.sent_at ? formatDateTime(emailLog.sent_at) : '—'}
                      </TableCell>
                      <TableCell className="max-w-[360px]">
                        {emailLog?.error_detail ? (
                          <details>
                            <summary className="cursor-pointer text-sm text-muted-foreground">
                              View error
                            </summary>
                            <div className="mt-1 text-sm text-destructive whitespace-pre-wrap">
                              {emailLog.error_detail}
                            </div>
                          </details>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>

                    {showWhatsappRow && (
                      <TableRow>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-muted-foreground" />
                            WhatsApp
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatNotificationBadge(
                            whatsappLog?.status ?? receipt.notification_summary?.whatsapp ?? null
                          )}
                        </TableCell>
                        <TableCell>
                          {whatsappLog?.sent_at ? formatDateTime(whatsappLog.sent_at) : '—'}
                        </TableCell>
                        <TableCell className="max-w-[360px]">
                          {whatsappLog?.error_detail ? (
                            <details>
                              <summary className="cursor-pointer text-sm text-muted-foreground">
                                View error
                              </summary>
                              <div className="mt-1 text-sm text-destructive whitespace-pre-wrap">
                                {whatsappLog.error_detail}
                              </div>
                            </details>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

