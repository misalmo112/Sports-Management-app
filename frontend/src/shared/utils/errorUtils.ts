/**
 * Error message formatting utilities
 * Converts technical errors to user-friendly messages
 */
import { AxiosError } from 'axios';

/**
 * API error response structure
 */
interface ApiErrorResponse {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
  details?: Record<string, string[]>;
  [key: string]: unknown;
}

const API_ERROR_ENVELOPE_KEYS = new Set([
  'status',
  'code',
  'message',
  'details',
  'errors',
  'request_id',
  'tenant',
  'timestamp',
]);

/**
 * Coerces DRF / API field values to a list of user-facing strings.
 */
function normalizeValidationMessages(val: unknown): string[] {
  if (val === null || val === undefined) return [];
  if (typeof val === 'string') {
    const t = val.trim();
    return t ? [sanitizeMessage(t)] : [];
  }
  if (Array.isArray(val)) {
    return val
      .map((x) => (typeof x === 'string' ? x : x != null ? String(x) : ''))
      .map((s) => s.trim())
      .filter(Boolean)
      .map(sanitizeMessage);
  }
  return [];
}

function mergeFieldErrorsFromObject(
  obj: Record<string, unknown>,
  out: Record<string, string[]>,
): void {
  for (const [key, val] of Object.entries(obj)) {
    if (key === 'detail') {
      const msgs = normalizeValidationMessages(val);
      if (msgs.length) {
        out.non_field_errors = [...(out.non_field_errors ?? []), ...msgs];
      }
      continue;
    }
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      continue;
    }
    const msgs = normalizeValidationMessages(val);
    if (msgs.length) {
      out[key] = msgs;
    }
  }
}

/**
 * Parses validation field errors from API bodies, including the global handler envelope:
 * `{ status, code, message, details: { allowed_modules: [...] } }`.
 * Returns null if the body carries no usable validation info.
 */
export function parseApiValidationEnvelope(data: unknown): Record<string, string[]> | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const out: Record<string, string[]> = {};

  if (o.details && typeof o.details === 'object' && !Array.isArray(o.details)) {
    mergeFieldErrorsFromObject(o.details as Record<string, unknown>, out);
  }
  if (o.errors && typeof o.errors === 'object' && !Array.isArray(o.errors)) {
    mergeFieldErrorsFromObject(o.errors as Record<string, unknown>, out);
  }

  for (const [key, val] of Object.entries(o)) {
    if (API_ERROR_ENVELOPE_KEYS.has(key)) continue;
    if (out[key]) continue;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) continue;
    const msgs = normalizeValidationMessages(val);
    if (msgs.length) {
      out[key] = msgs;
    }
  }

  if (typeof o.detail === 'string' || Array.isArray(o.detail)) {
    const msgs = normalizeValidationMessages(o.detail);
    if (msgs.length) {
      out.non_field_errors = [...(out.non_field_errors ?? []), ...msgs];
    }
  }

  const fieldKeys = Object.keys(out).filter((k) => k !== 'non_field_errors');
  if (fieldKeys.length === 0 && typeof o.message === 'string' && o.message.trim()) {
    out.non_field_errors = [sanitizeMessage(o.message)];
  }

  if (Object.keys(out).length === 0) return null;
  return out;
}

/**
 * Sanitizes error messages by removing technical details
 */
function sanitizeMessage(message: string): string {
  // Remove stack traces
  let sanitized = message.split('\n')[0];
  
  // Remove file paths
  sanitized = sanitized.replace(/\/[^\s]+/g, '');
  
  // Remove technical error codes (unless they're user-facing)
  sanitized = sanitized.replace(/Error\s+\d+:/gi, '');
  
  // Remove common technical prefixes
  sanitized = sanitized.replace(/^(Error|TypeError|ReferenceError|SyntaxError):\s*/i, '');
  
  return sanitized.trim() || 'An unexpected error occurred';
}

/**
 * Extracts user-friendly error message from Axios error
 */
function extractAxiosErrorMessage(error: AxiosError<ApiErrorResponse>): string {
  const response = error.response;
  
  if (!response) {
    // Network error or request timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (error.request) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    return 'An unexpected network error occurred.';
  }
  
  const data = response.data;
  const status = response.status;
  
  // Try to extract message from response data
  if (data && typeof data === 'object') {
    // Check for detail field (common in DRF)
    if (typeof data.detail === 'string' && data.detail) {
      return sanitizeMessage(data.detail);
    }
    
    // Check for message field
    if (typeof data.message === 'string' && data.message) {
      return sanitizeMessage(data.message);
    }
    
    // Check for validation errors (nested format)
    if (data.errors && typeof data.errors === 'object') {
      const errorMessages = Object.values(data.errors)
        .flat()
        .filter((msg): msg is string => typeof msg === 'string')
        .map(sanitizeMessage);
      
      if (errorMessages.length > 0) {
        return errorMessages[0];
      }
    }

    if (data.details && typeof data.details === 'object') {
      const errorMessages = Object.values(data.details)
        .flat()
        .filter((msg): msg is string => typeof msg === 'string')
        .map(sanitizeMessage);

      if (errorMessages.length > 0) {
        return errorMessages[0];
      }
    }
    
    // DRF field validation: { "field_name": ["error message"] }
    const entries = Object.entries(data);
    if (entries.length > 0) {
      const firstEntry = entries[0];
      if (Array.isArray(firstEntry[1]) && firstEntry[1].length > 0 && typeof firstEntry[1][0] === 'string') {
        const fieldLabel = String(firstEntry[0]).replace(/_/g, ' ');
        return `${fieldLabel}: ${sanitizeMessage(firstEntry[1][0])}`;
      }
      if (typeof firstEntry[1] === 'string') {
        return sanitizeMessage(firstEntry[1]);
      }
    }
  }
  
  // Fallback to status code messages
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'Please sign in to continue.';
    case 403:
      return "You don't have permission to access this resource.";
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'This action conflicts with existing data.';
    case 422:
      return 'Validation error. Please check your input.';
    case 429:
      return 'Too many requests. Please try again later.';
    case 500:
      return 'Something went wrong on our end. Please try again.';
    case 502:
    case 503:
    case 504:
      return 'The server is temporarily unavailable. Please try again later.';
    default:
      return `An error occurred (${status}). Please try again.`;
  }
}

/**
 * Formats an error into a user-friendly message
 * @param error - The error to format (Error, AxiosError, or unknown)
 * @returns A user-friendly error message
 */
export function formatErrorMessage(error: Error | unknown): string {
  // Handle Axios errors
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    return extractAxiosErrorMessage(error as AxiosError<ApiErrorResponse>);
  }
  
  // Handle standard Error objects
  if (error instanceof Error) {
    const message = error.message;
    
    // Check for common error patterns
    if (message.includes('Network Error') || message.includes('Failed to fetch')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    // Sanitize and return the message
    return sanitizeMessage(message);
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return sanitizeMessage(error);
  }
  
  // Fallback for unknown error types
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Extracts validation errors from API response
 * @param error - The error to extract validation errors from
 * @returns Record of field names to error messages, or null if no validation errors
 */
export function extractValidationErrors(
  error: Error | unknown
): Record<string, string[]> | null {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const data = axiosError.response?.data;
    return parseApiValidationEnvelope(data);
  }

  return null;
}

/**
 * Clears a field error from an error state object
 * Properly removes the field instead of setting it to undefined
 * @param errors - Current error state object
 * @param field - Field name to clear
 * @returns New error state object with the field removed
 */
export function clearFieldError(
  errors: Record<string, string[]>,
  field: string
): Record<string, string[]> {
  const next = { ...errors };
  delete next[field];
  return next;
}
