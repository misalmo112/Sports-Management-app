/**
 * Delete Student Dialog Component
 * Double confirmation dialog for student deletion
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface DeleteStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  studentName: string;
  isLoading?: boolean;
}

export const DeleteStudentDialog = ({
  open,
  onOpenChange,
  onConfirm,
  studentName,
  isLoading = false,
}: DeleteStudentDialogProps) => {
  const [showSecondConfirmation, setShowSecondConfirmation] = useState(false);

  const handleFirstConfirm = () => {
    setShowSecondConfirmation(true);
  };

  const handleSecondConfirm = () => {
    onConfirm();
    setShowSecondConfirmation(false);
  };

  const handleCancel = () => {
    setShowSecondConfirmation(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[425px]">
        {!showSecondConfirmation ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <DialogTitle>Delete Student</DialogTitle>
              </div>
              <DialogDescription>
                Are you sure you want to delete <strong>{studentName}</strong>? This action is
                permanent and cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleFirstConfirm} disabled={isLoading}>
                Continue
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <DialogTitle>Final Confirmation</DialogTitle>
              </div>
              <DialogDescription>
                <strong>Warning:</strong> This will permanently delete{' '}
                <strong>{studentName}</strong> and all associated data. This action cannot be
                undone.
                <br />
                <br />
                Are you absolutely sure you want to proceed?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleSecondConfirm} disabled={isLoading}>
                {isLoading ? 'Deleting...' : 'Yes, Delete Permanently'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
