/**
 * User actions component
 */
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { useUpdateUser } from '../hooks/useUpdateUser';
import { useResendInvite } from '../hooks/useResendInvite';
import type { User, UserStatus } from '../types';
import { useState } from 'react';
import { Eye, Mail } from 'lucide-react';

interface UserActionsProps {
  user: User;
  onUpdate?: () => void;
}

export const UserActions = ({ user, onUpdate }: UserActionsProps) => {
  const navigate = useNavigate();
  const updateUser = useUpdateUser();
  const resendInvite = useResendInvite();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleToggleStatus = async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      const newStatus: UserStatus = user.status === 'disabled' ? 'active' : 'disabled';
      await updateUser.mutateAsync({
        id: user.id,
        data: { status: newStatus },
      });
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update user status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResendInvite = async () => {
    if (isResending) return;

    setIsResending(true);
    try {
      await resendInvite.mutateAsync(user.id);
      onUpdate?.();
      alert('Invite sent successfully!');
    } catch (error: any) {
      console.error('Failed to resend invite:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to resend invite';
      alert(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const canResendInvite = user.status !== 'active';

  const resendButtonLabel =
    user.invite_status === 'pending' || user.invite_status === 'expired' || user.status === 'invited'
      ? 'Resend invite'
      : 'Send invite';

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(`/dashboard/users/${user.id}`)}
      >
        <Eye className="h-4 w-4 mr-1" />
        View
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleResendInvite}
        disabled={!canResendInvite || isResending || resendInvite.isPending}
        title={
          canResendInvite
            ? 'Generate or resend invite email'
            : 'User has already activated their account'
        }
      >
        <Mail className="h-4 w-4 mr-1" />
        {isResending || resendInvite.isPending ? 'Sending...' : resendButtonLabel}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggleStatus}
        disabled={isUpdating || updateUser.isPending}
      >
        {user.status === 'disabled' ? 'Enable' : 'Disable'}
      </Button>
    </div>
  );
};
