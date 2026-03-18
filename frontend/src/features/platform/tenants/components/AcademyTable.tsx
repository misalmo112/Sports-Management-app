/**
 * Academy table component
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
import { Eye, MoreHorizontal, UserX, UserCheck, Trash2, Download } from 'lucide-react';
import { useUpdateAcademy, useDeleteAcademy, useExportAcademy } from '../hooks/hooks';
import type { Academy } from '../types';

interface AcademyTableProps {
  academies: Academy[];
  isLoading?: boolean;
  onRowClick?: (academyId: string) => void;
  onUpdate?: () => void;
  onDelete?: () => void;
}

export const AcademyTable = ({
  academies,
  isLoading = false,
  onRowClick,
  onUpdate,
  onDelete,
}: AcademyTableProps) => {
  const navigate = useNavigate();
  const updateAcademy = useUpdateAcademy();
  const deleteAcademyMutation = useDeleteAcademy();
  const exportAcademyMutation = useExportAcademy();
  const [deleteTarget, setDeleteTarget] = useState<Academy | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return '—';
    }
  };

  const handleRowClick = (academyId: string) => {
    if (onRowClick) {
      onRowClick(academyId);
    } else {
      navigate(`/dashboard/platform/academies/${academyId}`);
    }
  };

  const handleSetActive = async (e: React.MouseEvent, academy: Academy) => {
    e.stopPropagation();
    try {
      await updateAcademy.mutateAsync({
        id: academy.id,
        data: { is_active: true },
      });
      onUpdate?.();
    } catch {
      // Error handled by mutation
    }
  };

  const handleSetInactive = async (e: React.MouseEvent, academy: Academy) => {
    e.stopPropagation();
    try {
      await updateAcademy.mutateAsync({
        id: academy.id,
        data: { is_active: false },
      });
      onUpdate?.();
    } catch {
      // Error handled by mutation
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, academy: Academy) => {
    e.stopPropagation();
    setDeleteError(null);
    setDeleteTarget(academy);
  };

  const handleExportClick = async (e: React.MouseEvent, academy: Academy) => {
    e.stopPropagation();
    try {
      await exportAcademyMutation.mutateAsync(academy.id);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteAcademyMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      onDelete?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete academy.';
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
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Onboarding</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
                Loading...
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  if (academies.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Onboarding</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No academies found
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
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Onboarding</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {academies.map((academy) => (
              <TableRow
                key={academy.id}
                className="cursor-pointer"
                onClick={() => handleRowClick(academy.id)}
              >
                <TableCell className="font-medium">{academy.name}</TableCell>
                <TableCell className="text-muted-foreground">{academy.slug}</TableCell>
                <TableCell>{academy.email}</TableCell>
                <TableCell>
                  {academy.is_active ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {academy.primary_admin ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">{academy.primary_admin.email}</span>
                      <Badge variant={academy.primary_admin.is_active ? 'default' : 'secondary'}>
                        {academy.primary_admin.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No admin</span>
                  )}
                </TableCell>
                <TableCell>
                  {academy.onboarding_completed ? (
                    <Badge variant="outline">Completed</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      Pending
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{formatDate(academy.created_at)}</TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRowClick(academy.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      {academy.is_active ? (
                        <DropdownMenuItem
                          onClick={(e) => handleSetInactive(e, academy)}
                          disabled={updateAcademy.isPending}
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Set inactive
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={(e) => handleSetActive(e, academy)}
                          disabled={updateAcademy.isPending}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Set active
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => handleExportClick(e, academy)}
                        disabled={exportAcademyMutation.isPending}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {exportAcademyMutation.isPending ? 'Exporting...' : 'Export data'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => handleDeleteClick(e, academy)}
                        disabled={deleteAcademyMutation.isPending}
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
            <DialogTitle>Delete academy</DialogTitle>
            <DialogDescription>
              {deleteTarget && (
                <>
                  Are you sure you want to delete academy &quot;{deleteTarget.name}&quot;? This
                  action cannot be undone.
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
              disabled={deleteAcademyMutation.isPending}
            >
              {deleteAcademyMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
