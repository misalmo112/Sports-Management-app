/**
 * Academy List Page (Platform - SUPERADMIN)
 * Lists all academies in the platform
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Search, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAcademies } from '../hooks/hooks';
import { AcademyTable } from '../components/AcademyTable';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';

export const AcademyListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error, refetch } = useAcademies({
    search: search || undefined,
    is_active: isActiveFilter,
    page,
    page_size: pageSize,
  });

  const handleNextPage = () => {
    if (data?.next) {
      setPage((prev) => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (data?.previous) {
      setPage((prev) => Math.max(1, prev - 1));
    }
  };

  const getTotalPages = () => {
    if (!data?.count) return 0;
    return Math.ceil(data.count / pageSize);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Academies</h1>
          <p className="text-muted-foreground mt-2">Manage all academies in the platform</p>
        </div>
        <Button onClick={() => navigate('/dashboard/platform/academies/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Academy
        </Button>
      </div>

      {error && (
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load academies"
          className="mb-6"
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Academy List</CardTitle>
          <CardDescription>All academies registered in the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search academies by name, email, or slug..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={isActiveFilter === undefined ? 'all' : isActiveFilter ? 'active' : 'inactive'}
              onValueChange={(value) => {
                setIsActiveFilter(
                  value === 'all' ? undefined : value === 'active' ? true : false
                );
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <LoadingState message="Loading academies..." />
          ) : data?.results && data.results.length > 0 ? (
            <>
              <AcademyTable
                academies={data.results}
                isLoading={false}
                onUpdate={() => refetch()}
                onDelete={() => refetch()}
              />

              {/* Pagination */}
              {data.count > pageSize && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1} to{' '}
                    {Math.min(page * pageSize, data.count)} of {data.count} academies
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={!data.previous || page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Page {page} of {getTotalPages()}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={!data.next}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title="No academies found"
              description="Get started by creating your first academy."
              actionLabel="Create Academy"
              onAction={() => navigate('/dashboard/platform/academies/new')}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
