/**
 * Users management page
 * 
 * Note: Role-based access is enforced at the route level.
 * Only ADMIN, OWNER, and SUPERADMIN can access this page.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkAdminAccess } from '@/shared/utils/roleAccess';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { UserTable } from '../components/UserTable';
import { CreateUserModal } from '../components/CreateUserModal';
import { useUsers } from '../hooks/useUsers';
import { useCoachesForManagement } from '../hooks/useCoachesForManagement';
import { Plus } from 'lucide-react';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';

export const UsersPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ADMIN' | 'COACH' | 'PARENT'>('ADMIN');
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, error, refetch } = useUsers(activeTab);
  const isCoachTab = activeTab === 'COACH';
  const {
    data: coachesForManagementData,
    isLoading: coachesLoading,
    error: coachesError,
    refetch: refetchCoaches,
  } = useCoachesForManagement(isCoachTab);

  const isLoadingPage = isCoachTab ? coachesLoading : isLoading;
  const pageError = isCoachTab ? coachesError : error;
  const refetchPage = isCoachTab ? refetchCoaches : refetch;

  // Additional client-side check (route-level protection is primary)
  useEffect(() => {
    if (!checkAdminAccess()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleUserUpdate = () => {
    refetch();
    if (isCoachTab) refetchCoaches();
  };

  const handleInviteSuccess = () => {
    refetch();
    if (isCoachTab) refetchCoaches();
  };

  if (isLoadingPage) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground">
              Manage admins, coaches, and parents for your academy
            </p>
          </div>
        </div>
        <LoadingState message="Loading users..." />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground">
              Manage admins, coaches, and parents for your academy
            </p>
          </div>
        </div>
        <ErrorState
          error={pageError}
          onRetry={() => refetchPage()}
          title="Failed to load users"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage admins, coaches, and parents for your academy
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            View and manage users by role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ADMIN">Admins</TabsTrigger>
              <TabsTrigger value="COACH">Coaches</TabsTrigger>
              <TabsTrigger value="PARENT">Parents</TabsTrigger>
            </TabsList>

            <TabsContent value="ADMIN" className="mt-6">
              {data?.results && data.results.length > 0 ? (
                <UserTable
                  users={data.results}
                  isLoading={false}
                  onUserUpdate={handleUserUpdate}
                />
              ) : (
                <EmptyState
                  title={`No ${activeTab.toLowerCase()}s found`}
                  description="Get started by inviting your first user."
                  actionLabel="Invite User"
                  onAction={() => setModalOpen(true)}
                />
              )}
            </TabsContent>

            <TabsContent value="COACH" className="mt-6">
              {coachesForManagementData && coachesForManagementData.length > 0 ? (
                <UserTable
                  coachManagementRows={coachesForManagementData}
                  isLoading={false}
                  onUserUpdate={handleUserUpdate}
                />
              ) : (
                <EmptyState
                  title="No coaches found"
                  description="Get started by adding a coach in Staff or inviting your first coach."
                  actionLabel="Invite User"
                  onAction={() => setModalOpen(true)}
                />
              )}
            </TabsContent>

            <TabsContent value="PARENT" className="mt-6">
              {data?.results && data.results.length > 0 ? (
                <UserTable
                  users={data.results}
                  isLoading={false}
                  onUserUpdate={handleUserUpdate}
                />
              ) : (
                <EmptyState
                  title={`No ${activeTab.toLowerCase()}s found`}
                  description="Get started by inviting your first user."
                  actionLabel="Invite User"
                  onAction={() => setModalOpen(true)}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CreateUserModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleInviteSuccess}
      />
    </div>
  );
};
