/**
 * Plan table component
 */
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { Eye, MoreHorizontal, UserX, UserCheck, Trash2 } from 'lucide-react';
import { useUpdatePlanMutation } from '../hooks/useUpdatePlan';
import { useDeletePlan } from '../hooks/useDeletePlan';
import type { Plan } from '../types';

interface PlanTableProps {
  plans: Plan[];
  isLoading?: boolean;
  onUpdate?: () => void;
  onDelete?: () => void;
}

export const PlanTable = ({
  plans,
  isLoading = false,
  onUpdate,
  onDelete,
}: PlanTableProps) => {
  const navigate = useNavigate();
  const updatePlan = useUpdatePlanMutation();
  const deletePlanMutation = useDeletePlan();
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return '—';
    }
  };

  const formatPrice = (amount?: number, currency = 'USD') => {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const handleSetActive = async (e: React.MouseEvent, plan: Plan) => {
    e.stopPropagation();
    try {
      await updatePlan.mutateAsync({
        id: plan.id,
        data: { is_active: true },
      });
      onUpdate?.();
    } catch {
      // Error handled by mutation
    }
  };

  const handleSetInactive = async (e: React.MouseEvent, plan: Plan) => {
    e.stopPropagation();
    try {
      await updatePlan.mutateAsync({
        id: plan.id,
        data: { is_active: false },
      });
      onUpdate?.();
    } catch {
      // Error handled by mutation
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, plan: Plan) => {
    e.stopPropagation();
    setDeleteError(null);
    setDeleteTarget(plan);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deletePlanMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      onDelete?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
            'Failed to delete plan.';
      setDeleteError(message);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Monthly Price</TableHead>
              <TableHead>Yearly Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                Loading...
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Monthly Price</TableHead>
              <TableHead>Yearly Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No plans found
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Monthly Price</TableHead>
              <TableHead>Yearly Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="font-medium">{plan.name}</TableCell>
                <TableCell className="text-muted-foreground">{plan.slug}</TableCell>
                <TableCell>{formatPrice(plan.price_monthly, plan.currency)}</TableCell>
                <TableCell>{formatPrice(plan.price_yearly, plan.currency)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {plan.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                    {plan.is_public && (
                      <Badge variant="outline">Public</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{formatDate(plan.created_at)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/dashboard/platform/plans/${plan.id}`)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      {plan.is_active ? (
                        <DropdownMenuItem
                          onClick={(e) => handleSetInactive(e, plan)}
                          disabled={updatePlan.isPending}
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Set inactive
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={(e) => handleSetActive(e, plan)}
                          disabled={updatePlan.isPending}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Set active
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => handleDeleteClick(e, plan)}
                        disabled={deletePlanMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && handleDeleteCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete plan</DialogTitle>
            <DialogDescription>
              {deleteTarget && (
                <>
                  Are you sure you want to delete plan &quot;{deleteTarget.name}&quot;? This action
                  cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deletePlanMutation.isPending}
            >
              {deletePlanMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
