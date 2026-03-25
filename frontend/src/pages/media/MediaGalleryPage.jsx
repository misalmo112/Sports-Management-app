import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, ImageIcon, Trash2, Video } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { API_ENDPOINTS } from '@/shared/constants/api';
import apiClient from '@/shared/services/api';
import { getClasses } from '@/features/tenant/classes/services/api';

const PAGE_SIZE = 24;

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** idx;
  const rounded = value >= 10 ? value.toFixed(0) : value.toFixed(1);
  return `${rounded} ${units[idx]}`;
};

const toDateInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const isImageType = (mimeType = '') => mimeType.toLowerCase().startsWith('image/');
const isVideoType = (mimeType = '') => mimeType.toLowerCase().startsWith('video/');

const getMediaList = async ({ page, classId }) => {
  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('page_size', String(PAGE_SIZE));
  queryParams.set('is_active', 'true');
  if (classId) {
    queryParams.set('class_obj', classId);
  }
  const url = `${API_ENDPOINTS.TENANT.MEDIA.LIST}?${queryParams.toString()}`;
  const response = await apiClient.get(url);
  return response.data;
};

const deactivateMedia = async (mediaId) => {
  await apiClient.patch(API_ENDPOINTS.TENANT.MEDIA.DETAIL(mediaId), { is_active: false });
};

const bulkDeactivateMedia = async (mediaIds) => {
  try {
    await apiClient.post('/api/v1/tenant/media/bulk-deactivate/', { ids: mediaIds });
  } catch (error) {
    // Fallback for backends where bulk endpoint does not exist yet.
    const statusCode = error?.response?.status;
    if (statusCode === 404 || statusCode === 405) {
      await Promise.all(mediaIds.map((id) => deactivateMedia(id)));
      return;
    }
    throw error;
  }
};

export default function MediaGalleryPage() {
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  const mediaQueryKey = ['media-gallery-page', { page, classId: selectedClassId }];
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: mediaQueryKey,
    queryFn: () => getMediaList({ page, classId: selectedClassId || undefined }),
    staleTime: 15000,
    refetchOnWindowFocus: false,
  });

  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ['classes', 'list', { is_active: true, page_size: 200 }],
    queryFn: () => getClasses({ is_active: true, page_size: 200 }),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const classOptions = useMemo(
    () =>
      (classesData?.results ?? []).map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
    [classesData]
  );

  const mediaItems = data?.results ?? [];
  const filteredItems = useMemo(() => {
    return mediaItems.filter((item) => {
      const captureDate = toDateInput(item.capture_date);
      if (dateFrom && (!captureDate || captureDate < dateFrom)) return false;
      if (dateTo && (!captureDate || captureDate > dateTo)) return false;
      if (fileTypeFilter === 'images' && !isImageType(item.mime_type)) return false;
      if (fileTypeFilter === 'videos' && !isVideoType(item.mime_type)) return false;
      return true;
    });
  }, [mediaItems, dateFrom, dateTo, fileTypeFilter]);

  const singleDeactivateMutation = useMutation({
    mutationFn: deactivateMedia,
    onSuccess: (_, mediaId) => {
      setSelectedIds((prev) => prev.filter((id) => id !== mediaId));
      queryClient.setQueryData(mediaQueryKey, (previous) => {
        if (!previous?.results) return previous;
        return {
          ...previous,
          count: Math.max(0, (previous.count ?? previous.results.length) - 1),
          results: previous.results.filter((item) => item.id !== mediaId),
        };
      });
    },
  });

  const bulkDeactivateMutation = useMutation({
    mutationFn: bulkDeactivateMedia,
    onSuccess: (_, ids) => {
      setSelectedIds([]);
      queryClient.setQueryData(mediaQueryKey, (previous) => {
        if (!previous?.results) return previous;
        const idSet = new Set(ids);
        const nextResults = previous.results.filter((item) => !idSet.has(item.id));
        return {
          ...previous,
          count: Math.max(0, (previous.count ?? previous.results.length) - ids.length),
          results: nextResults,
        };
      });
    },
  });

  const handleToggleSelected = (mediaId, checked) => {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(mediaId) ? prev : [...prev, mediaId];
      return prev.filter((id) => id !== mediaId);
    });
  };

  const handleSingleDeactivate = async (mediaId) => {
    const confirmed = window.confirm('Deactivate this media item?');
    if (!confirmed) return;
    await singleDeactivateMutation.mutateAsync(mediaId);
  };

  const handleBulkDeactivate = async () => {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(`Deactivate ${selectedIds.length} selected item(s)?`);
    if (!confirmed) return;
    await bulkDeactivateMutation.mutateAsync(selectedIds);
  };

  const totalPages = data?.count ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  return (
    <div className="container mx-auto max-w-7xl py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Media Gallery</h1>
          <p className="text-muted-foreground mt-1">Browse and manage class media files.</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/dashboard/academy/media/upload">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go to upload
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter by class, capture date range, and media type.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="media-gallery-class">Class</Label>
            <SearchableSelect
              id="media-gallery-class"
              value={selectedClassId}
              onValueChange={(value) => {
                setSelectedClassId(value);
                setPage(1);
                setSelectedIds([]);
              }}
              options={classOptions}
              placeholder="All classes"
              searchPlaceholder="Search classes..."
              emptyMessage="No classes found."
              isLoading={classesLoading}
              loadingMessage="Loading classes..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="media-gallery-date-from">Date from</Label>
            <Input
              id="media-gallery-date-from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="media-gallery-date-to">Date to</Label>
            <Input
              id="media-gallery-date-to"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>File type</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={fileTypeFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setFileTypeFilter('all')}
              >
                All
              </Button>
              <Button
                type="button"
                variant={fileTypeFilter === 'images' ? 'default' : 'outline'}
                onClick={() => setFileTypeFilter('images')}
              >
                Images
              </Button>
              <Button
                type="button"
                variant={fileTypeFilter === 'videos' ? 'default' : 'outline'}
                onClick={() => setFileTypeFilter('videos')}
              >
                Videos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedIds.length > 0 && (
        <Alert>
          <AlertTitle>{selectedIds.length} selected</AlertTitle>
          <AlertDescription className="mt-2 flex items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleBulkDeactivate}
              disabled={bulkDeactivateMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {bulkDeactivateMutation.isPending ? 'Deactivating...' : 'Deactivate selected'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedIds([])}>
              Clear selection
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <Skeleton key={idx} className="h-64 w-full" />
          ))}
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load media</AlertTitle>
          <AlertDescription>{error?.message ?? 'Unexpected error while loading media.'}</AlertDescription>
        </Alert>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No media found for the selected filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-square bg-muted">
                  {isImageType(item.mime_type) ? (
                    <img
                      src={item.file_url}
                      alt={item.file_name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      {isVideoType(item.mime_type) ? (
                        <Video className="h-10 w-10" aria-label="Video file" />
                      ) : (
                        <ImageIcon className="h-10 w-10" aria-label="Media file" />
                      )}
                    </div>
                  )}
                  <div className="absolute left-2 top-2">
                    <input
                      type="checkbox"
                      aria-label={`Select ${item.file_name}`}
                      checked={selectedIds.includes(item.id)}
                      onChange={(event) => handleToggleSelected(item.id, event.target.checked)}
                    />
                  </div>
                </div>
                <div className="space-y-2 p-3">
                  <p className="line-clamp-1 text-sm font-medium" title={item.file_name}>
                    {item.file_name}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="line-clamp-1">
                      {item.class_detail?.name ?? 'Unassigned'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatBytes(item.file_size)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Capture date: {item.capture_date || '-'}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => handleSingleDeactivate(item.id)}
                    disabled={singleDeactivateMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Deactivate
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
          {isFetching ? ' (refreshing...)' : ''}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPage((prev) => Math.max(1, prev - 1));
              setSelectedIds([]);
            }}
            disabled={page <= 1}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPage((prev) => prev + 1);
              setSelectedIds([]);
            }}
            disabled={!data?.next}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
