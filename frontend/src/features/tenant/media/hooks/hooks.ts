/**
 * TanStack Query hooks for Tenant Media
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMedia,
  getMediaById,
  uploadMedia,
  deleteMedia,
} from '../services/api';
import type {
  MediaFilesListResponse,
  MediaFile,
  UploadMediaRequest,
} from '../types';

/**
 * Hook for fetching media files list
 */
export const useMedia = (params?: {
  is_active?: boolean;
  mime_type?: string;
  class_obj?: number;
  search?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery<MediaFilesListResponse, Error>({
    queryKey: ['media', 'list', params],
    queryFn: () => getMedia(params),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching a single media file
 */
export const useMediaById = (id: string | undefined) => {
  return useQuery<MediaFile, Error>({
    queryKey: ['media', 'detail', id],
    queryFn: () => getMediaById(id!),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for uploading a media file
 */
export const useUploadMedia = () => {
  const queryClient = useQueryClient();

  return useMutation<MediaFile, Error, UploadMediaRequest>({
    mutationFn: uploadMedia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', 'list'] });
    },
  });
};

/**
 * Hook for deleting a media file
 */
export const useDeleteMedia = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteMedia,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['media', 'list'] });
      queryClient.removeQueries({ queryKey: ['media', 'detail', id] });
    },
  });
};
