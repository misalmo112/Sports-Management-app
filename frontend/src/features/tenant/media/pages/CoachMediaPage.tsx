/**
 * Coach Media Page
 * View and upload media for coach's classes
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { MediaGallery } from '../components/MediaGallery';
import { useMedia } from '../hooks/hooks';
import { useClasses } from '@/features/tenant/classes/hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { CoachMediaUploadModal } from '../components/CoachMediaUploadModal';
import { Plus, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { MediaFile } from '../types';

export const CoachMediaPage = () => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Fetch classes (already filtered by coach on backend)
  const { data: classesData } = useClasses({ is_active: true });

  const { data, isLoading, error, refetch } = useMedia({
    search: search || undefined,
    class_obj: classFilter ? parseInt(classFilter) : undefined,
    page,
    page_size: pageSize,
  });

  const handleMediaClick = (mediaFile: MediaFile) => {
    if (mediaFile.file_url) {
      window.open(mediaFile.file_url, '_blank');
    }
  };

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

  const clearFilters = () => {
    setClassFilter('');
    setSearch('');
    setPage(1);
  };

  const hasActiveFilters = classFilter || search;

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Media</h1>
          <p className="text-muted-foreground mt-2">Media for your classes</p>
        </div>
        <Button onClick={() => setUploadModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Upload Media
        </Button>
      </div>

      {error && (
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          title="Failed to load media"
          className="mb-6"
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Media Files</CardTitle>
          <CardDescription>Media files for your assigned classes</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class-filter">Class</Label>
                <Select value={classFilter || 'all'} onValueChange={(value) => {
                  setClassFilter(value === 'all' ? '' : value);
                  setPage(1);
                }}>
                  <SelectTrigger id="class-filter">
                    <SelectValue placeholder="All classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All classes</SelectItem>
                    {classesData?.results.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id.toString()}>
                        {classItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search media files..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>&nbsp;</Label>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="w-full"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <LoadingState message="Loading media files..." />
          ) : data?.results && data.results.length > 0 ? (
            <>
              <MediaGallery
                mediaFiles={data.results}
                onMediaClick={handleMediaClick}
              />

              {/* Pagination */}
              {data.count > pageSize && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1} to{' '}
                    {Math.min(page * pageSize, data.count)} of {data.count} files
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
                    <div className="flex items-center gap-2 px-4">
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
              title="No media files found"
              description={
                hasActiveFilters
                  ? "Try adjusting your filters to see more results."
                  : "Get started by uploading your first media file."
              }
              actionLabel={hasActiveFilters ? undefined : "Upload Media"}
              onAction={hasActiveFilters ? undefined : () => setUploadModalOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <CoachMediaUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
};
