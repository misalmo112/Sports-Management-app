/**
 * User status badge component
 */
import { Badge } from '@/shared/components/ui/badge';
import type { UserStatus } from '../types';

interface UserStatusBadgeProps {
  status: UserStatus;
}

export const UserStatusBadge = ({ status }: UserStatusBadgeProps) => {
  const getVariant = (status: UserStatus) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'invited':
        return 'warning';
      case 'disabled':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getLabel = (status: UserStatus) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'invited':
        return 'Invited';
      case 'disabled':
        return 'Disabled';
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
