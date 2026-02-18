/**
 * Tests for media utils
 */
import { describe, it, expect } from 'vitest';
import { AxiosError } from 'axios';
import {
  formatBytes,
  isQuotaError,
  extractQuotaError,
  formatQuotaErrorMessage,
  isImage,
  isVideo,
} from '../../utils';
import type { QuotaError } from '../../types';

describe('formatBytes', () => {
  it('formats bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1073741824)).toBe('1 GB');
  });

  it('formats with decimal places', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1572864)).toBe('1.5 MB');
  });
});

describe('isQuotaError', () => {
  it('returns true for quota exceeded error', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 403,
        data: {
          detail: 'Quota exceeded',
        },
      },
    } as unknown as AxiosError<QuotaError>;

    expect(isQuotaError(error)).toBe(true);
  });

  it('returns false for non-quota errors', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          detail: 'Invalid request',
        },
      },
    } as unknown as AxiosError<QuotaError>;

    expect(isQuotaError(error)).toBe(false);
  });

  it('returns false for non-axios errors', () => {
    const error = new Error('Some error');
    expect(isQuotaError(error)).toBe(false);
  });
});

describe('extractQuotaError', () => {
  it('extracts quota error details', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 403,
        data: {
          detail: 'Quota exceeded',
          quota_type: 'storage_bytes',
          current_usage: 1000000,
          limit: 2000000,
          requested: 500000,
        },
      },
    } as unknown as AxiosError<QuotaError>;

    const quotaError = extractQuotaError(error);
    expect(quotaError).toEqual({
      detail: 'Quota exceeded',
      quota_type: 'storage_bytes',
      current_usage: 1000000,
      limit: 2000000,
      requested: 500000,
    });
  });

  it('returns null for non-quota errors', () => {
    const error = new Error('Some error');
    expect(extractQuotaError(error)).toBeNull();
  });
});

describe('formatQuotaErrorMessage', () => {
  it('formats storage quota error message', () => {
    const error: QuotaError = {
      detail: 'Quota exceeded',
      quota_type: 'storage_bytes',
      current_usage: 1073741824, // 1 GB
      limit: 2147483648, // 2 GB
      requested: 536870912, // 512 MB
    };

    const message = formatQuotaErrorMessage(error);
    expect(message).toContain('Storage quota exceeded');
    expect(message).toContain('1 GB');
    expect(message).toContain('2 GB');
    expect(message).toContain('512 MB');
  });

  it('formats generic quota error message', () => {
    const error: QuotaError = {
      detail: 'Quota exceeded',
      current_usage: 10,
      limit: 20,
    };

    const message = formatQuotaErrorMessage(error);
    expect(message).toContain('Quota exceeded');
    expect(message).toContain('10');
    expect(message).toContain('20');
  });

  it('formats fallback message when details missing', () => {
    const error: QuotaError = {
      detail: 'Quota exceeded',
    };

    const message = formatQuotaErrorMessage(error);
    expect(message).toContain('Storage quota exceeded');
    expect(message).toContain('contact your administrator');
  });
});

describe('isImage', () => {
  it('returns true for image mime types', () => {
    expect(isImage('image/jpeg')).toBe(true);
    expect(isImage('image/png')).toBe(true);
    expect(isImage('image/gif')).toBe(true);
    expect(isImage('image/webp')).toBe(true);
  });

  it('returns false for non-image mime types', () => {
    expect(isImage('video/mp4')).toBe(false);
    expect(isImage('application/pdf')).toBe(false);
    expect(isImage('text/plain')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isImage(undefined)).toBe(false);
  });
});

describe('isVideo', () => {
  it('returns true for video mime types', () => {
    expect(isVideo('video/mp4')).toBe(true);
    expect(isVideo('video/quicktime')).toBe(true);
    expect(isVideo('video/webm')).toBe(true);
  });

  it('returns false for non-video mime types', () => {
    expect(isVideo('image/jpeg')).toBe(false);
    expect(isVideo('application/pdf')).toBe(false);
    expect(isVideo('text/plain')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isVideo(undefined)).toBe(false);
  });
});
