/**
 * Plans List Page (Platform - SUPERADMIN)
 * Lists all subscription plans
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { PlanTable } from '../components/PlanTable';
import { usePlans } from '../hooks/usePlans';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';

export const PlansListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);

  const { data, isLoading, error, refetch } = usePlans({
    search: search || undefined,
    is_active: isActiveFilter,
  });

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscription Plans</h1>
          <p className="text-muted-foreground mt-2">Manage subscription plans for academies</p>
        </div>
        <Button onClick={() => navigate('/dashboard/platform/plans/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Plan
        </Button>
      </div>

      {error && (
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load plans"
          className="mb-6"
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Plans</CardTitle>
          <CardDescription>All subscription plans in the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search plans..."
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
            <LoadingState message="Loading plans..." />
          ) : data?.results && data.results.length > 0 ? (
            <PlanTable
            plans={data.results}
            isLoading={false}
            onUpdate={() => refetch()}
            onDelete={() => refetch()}
          />
          ) : (
            <EmptyState
              title="No plans found"
              description="Get started by creating your first subscription plan."
              actionLabel="Create Plan"
              onAction={() => navigate('/dashboard/platform/plans/new')}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
