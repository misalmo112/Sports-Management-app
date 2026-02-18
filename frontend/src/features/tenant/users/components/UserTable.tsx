/**
 * User table component
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
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { UserStatusBadge } from './UserStatusBadge';
import { InviteStatusBadge } from './InviteStatusBadge';
import { UserActions } from './UserActions';
import type { User, CoachManagementRow } from '../types';
import { Copy, Mail } from 'lucide-react';
import { useAcademyFormat } from '@/shared/hooks/useAcademyFormat';
import { useInviteStaffCoach } from '../hooks/useInviteStaffCoach';

interface UserTableProps {
  users?: User[];
  coachManagementRows?: CoachManagementRow[];
  isLoading?: boolean;
  onUserUpdate?: () => void;
}

function isCoachManagementRow(row: User | CoachManagementRow): row is CoachManagementRow {
  return 'source' in row;
}

export const UserTable = ({
  users = [],
  coachManagementRows,
  isLoading = false,
  onUserUpdate,
}: UserTableProps) => {
  const [copiedUserId, setCopiedUserId] = useState<number | null>(null);
  const { formatDateTime } = useAcademyFormat();
  const inviteStaffCoach = useInviteStaffCoach();
  const rows = coachManagementRows ?? users;
  const isCoachManagement = Array.isArray(coachManagementRows) && coachManagementRows.length > 0;

  const formatInviteInfo = (user: User | CoachManagementRow) => {
    if (!user.invite_status || user.invite_status === 'none') {
      return 'No invite';
    }

    if (user.invite_status === 'accepted') {
      if (user.invite_accepted_at) {
        return `Accepted: ${formatDateTime(user.invite_accepted_at)}`;
      }
      return 'Accepted';
    }

    if (user.invite_status === 'pending') {
      const parts: string[] = [];
      if (user.invite_created_at) {
        parts.push(`Created: ${formatDateTime(user.invite_created_at)}`);
      }
      if (user.invite_expires_at) {
        parts.push(`Expires: ${formatDateTime(user.invite_expires_at)}`);
      }
      return parts.length > 0 ? parts.join(', ') : 'Pending';
    }

    if (user.invite_status === 'expired') {
      if (user.invite_expires_at) {
        return `Expired: ${formatDateTime(user.invite_expires_at)}`;
      }
      return 'Expired';
    }

    return '—';
  };

  const formatName = (user: User | CoachManagementRow) => {
    if (user.full_name) return user.full_name;
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return '—';
  };

  const formatRole = (role: string) => {
    return role.charAt(0) + role.slice(1).toLowerCase();
  };

  const handleCopyInviteLink = async (link: string, userId: number) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedUserId(userId);
      setTimeout(() => {
        setCopiedUserId((current) => (current === userId ? null : current));
      }, 2000);
    } catch {
      setCopiedUserId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invite Status</TableHead>
              <TableHead>Invite Info</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">No users found</p>
      </div>
    );
  }

  const inviteError =
    inviteStaffCoach.isError && inviteStaffCoach.error
      ? (inviteStaffCoach.error as { response?: { data?: { detail?: string } }; message?: string })
          ?.response?.data?.detail ||
        (inviteStaffCoach.error as Error).message ||
        'Failed to send invite'
      : null;

  return (
    <div className="space-y-2">
      {inviteError && (
        <Alert variant="destructive">
          <AlertDescription>{inviteError}</AlertDescription>
        </Alert>
      )}
      <div className="rounded-md border">
      <Table>
        <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invite Status</TableHead>
              <TableHead>Invite Info</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            if (isCoachManagement && isCoachManagementRow(row)) {
              if (row.source === 'staff_not_invited') {
                return (
                  <TableRow key={`staff-${row.coach_id}`}>
                    <TableCell className="font-medium">{formatName(row)}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>Coach</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>
                      <InviteStatusBadge status="none" />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">Not invited</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => inviteStaffCoach.mutate(row.coach_id)}
                        disabled={inviteStaffCoach.isPending}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        {inviteStaffCoach.isPending ? 'Sending...' : 'Invite'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              }
              // row.source === 'user'
              const userRow = row as User & { source: 'user'; user_id: number };
              const userForActions: User = { ...userRow, id: userRow.user_id };
              return (
                <TableRow key={`user-${userRow.user_id}`}>
                  <TableCell className="font-medium">{formatName(userRow)}</TableCell>
                  <TableCell>{userRow.email}</TableCell>
                  <TableCell>{formatRole(userRow.role)}</TableCell>
                  <TableCell>
                    <UserStatusBadge status={userRow.status} />
                  </TableCell>
                  <TableCell>
                    <InviteStatusBadge status={userRow.invite_status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex flex-col gap-2">
                      <span>{formatInviteInfo(userRow)}</span>
                      {userRow.invite_status === 'pending' && userRow.invite_link ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyInviteLink(userRow.invite_link as string, userRow.user_id)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            {copiedUserId === userRow.user_id ? 'Copied' : 'Copy Invite Link'}
                          </Button>
                          <span className="break-all text-xs text-muted-foreground">
                            {userRow.invite_link}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{formatDateTime(userRow.last_login)}</TableCell>
                  <TableCell className="text-right">
                    <UserActions user={userForActions} onUpdate={onUserUpdate} />
                  </TableCell>
                </TableRow>
              );
            }
            const user = row as User;
            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{formatName(user)}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{formatRole(user.role)}</TableCell>
                <TableCell>
                  <UserStatusBadge status={user.status} />
                </TableCell>
                <TableCell>
                  <InviteStatusBadge status={user.invite_status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <div className="flex flex-col gap-2">
                    <span>{formatInviteInfo(user)}</span>
                    {user.invite_status === 'pending' && user.invite_link ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyInviteLink(user.invite_link as string, user.id)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          {copiedUserId === user.id ? 'Copied' : 'Copy Invite Link'}
                        </Button>
                        <span className="break-all text-xs text-muted-foreground">
                          {user.invite_link}
                        </span>
                      </>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>{formatDateTime(user.last_login)}</TableCell>
                <TableCell className="text-right">
                  <UserActions user={user} onUpdate={onUserUpdate} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  );
};
