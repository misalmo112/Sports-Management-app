/**
 * Currencies List Page (Platform - SUPERADMIN)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { usePlatformCurrencies } from '../hooks/usePlatformCurrencies';
import { useDeleteCurrency } from '../hooks/useDeleteCurrency';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import type { Currency } from '../types';

export const CurrenciesListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Currency | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = usePlatformCurrencies({
    search: search || undefined,
    is_active: isActiveFilter,
  });
  const deleteCurrency = useDeleteCurrency();

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteCurrency.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Failed to delete currency.';
      setDeleteError(msg);
    }
  };

  const results = data?.results ?? [];

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Currencies</h1>
          <p className="text-muted-foreground mt-2">Manage platform currency codes</p>
        </div>
        <Button onClick={() => navigate('/dashboard/platform/masters/currencies/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Currency
        </Button>
      </div>

      {error && (
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load currencies"
          className="mb-6"
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Currencies</CardTitle>
          <CardDescription>All currencies available for academies and plans</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by code or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={isActiveFilter === undefined ? 'default' : 'outline'}
              onClick={() => setIsActiveFilter(undefined)}
            >
              All
            </Button>
            <Button
              variant={isActiveFilter === true ? 'default' : 'outline'}
              onClick={() => setIsActiveFilter(true)}
            >
              Active
            </Button>
            <Button
              variant={isActiveFilter === false ? 'default' : 'outline'}
              onClick={() => setIsActiveFilter(false)}
            >
              Inactive
            </Button>
          </div>

          {isLoading ? (
            <LoadingState message="Loading currencies..." />
          ) : results.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.code}</TableCell>
                      <TableCell>{row.name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={row.is_active ? 'default' : 'secondary'}>
                          {row.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.sort_order}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/dashboard/platform/masters/currencies/${row.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(row);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              title="No currencies found"
              description="Add a currency to make it available to academies."
              actionLabel="Add Currency"
              onAction={() => navigate('/dashboard/platform/masters/currencies/new')}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete currency</DialogTitle>
            <DialogDescription>
              Delete currency &quot;{deleteTarget?.code}&quot;? This may fail if it is in use by
              academies or plans. You can deactivate it instead.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
