/**
 * Invite status badge component
 */
import { Badge } from '@/shared/components/ui/badge';

export type InviteStatus = 'accepted' | 'pending' | 'expired' | 'none';

interface InviteStatusBadgeProps {
  status?: InviteStatus;
}

export const InviteStatusBadge = ({ status }: InviteStatusBadgeProps) => {
  if (!status || status === 'none') {
    return (
      <Badge variant="secondary">
        No Invite
      </Badge>
    );
  }

  const getVariant = (status: InviteStatus) => {
    switch (status) {
      case 'accepted':
        return 'success';
      case 'pending':
        return 'warning';
      case 'expired':
        return 'destructive';
      case 'none':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getLabel = (status: InviteStatus) => {
    switch (status) {
      case 'accepted':
        return 'Accepted';
      case 'pending':
        return 'Pending';
      case 'expired':
        return 'Expired';
      case 'none':
        return 'No Invite';
      default:
        return status;
    }
  };

  return (
    <Badge variant={getVariant(status)}>
      {getLabel(status)}
    </Badge>
  );
};
