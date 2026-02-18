/**
 * Media Page
 * Manage academy media files
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { MediaGallery } from '../components/MediaGallery';
import { MediaUploadModal } from '../components/MediaUploadModal';
import { useMedia } from '../hooks/hooks';
import { LoadingState } from '@/shared/components/common/LoadingState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MediaFile } from '../types';

export const MediaPage = () => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error, refetch } = useMedia({
    search: search || undefined,
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

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Media</h1>
          <p className="text-muted-foreground mt-2">Manage academy media files</p>
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
          <CardDescription>All media files in the academy</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
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
              description="Get started by uploading your first media file."
              actionLabel="Upload Media"
              onAction={() => setUploadModalOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <MediaUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
};
