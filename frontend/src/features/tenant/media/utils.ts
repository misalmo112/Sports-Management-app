/**
 * Utility functions for media feature
 */
import { AxiosError } from 'axios';
import type { QuotaError } from './types';

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Check if an error is a quota exceeded error
 */
export function isQuotaError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<QuotaError>;
    return (
      axiosError.response?.status === 403 &&
      axiosError.response?.data?.detail === 'Quota exceeded'
    );
  }
  return false;
}

/**
 * Extract quota error details from error
 */
export function extractQuotaError(error: unknown): QuotaError | null {
  if (isQuotaError(error)) {
    const axiosError = error as AxiosError<QuotaError>;
    return axiosError.response?.data || null;
  }
  return null;
}

/**
 * Format quota error message for display
 */
export function formatQuotaErrorMessage(error: QuotaError): string {
  const { quota_type, current_usage, limit, requested } = error;
  
  if (quota_type === 'storage_bytes') {
    const used = current_usage ? formatBytes(current_usage) : 'unknown';
    const total = limit ? formatBytes(limit) : 'unknown';
    const req = requested ? formatBytes(requested) : 'unknown';
    
    return `Storage quota exceeded. You are using ${used} of ${total} available. The file you're trying to upload (${req}) would exceed your limit.`;
  }
  
  // Generic quota error
  if (current_usage !== undefined && limit !== undefined) {
    return `Quota exceeded. Current usage: ${current_usage}/${limit}.`;
  }
  
  return 'Storage quota exceeded. Please contact your administrator to increase your storage limit.';
}

/**
 * Check if a file is an image based on mime type
 */
export function isImage(mimeType?: string): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith('image/');
}

/**
 * Check if a file is a video based on mime type
 */
export function isVideo(mimeType?: string): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith('video/');
}
