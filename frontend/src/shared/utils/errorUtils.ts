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
    const response = axiosError.response;
    
    if (response?.data?.errors && typeof response.data.errors === 'object') {
      const errors: Record<string, string[]> = {};
      
      for (const [field, messages] of Object.entries(response.data.errors)) {
        if (Array.isArray(messages)) {
          errors[field] = messages
            .filter((msg): msg is string => typeof msg === 'string')
            .map(sanitizeMessage);
        }
      }
      
      if (Object.keys(errors).length > 0) {
        return errors;
      }
    }

    if (response?.data?.details && typeof response.data.details === 'object') {
      const errors: Record<string, string[]> = {};

      for (const [field, messages] of Object.entries(response.data.details)) {
        if (Array.isArray(messages)) {
          errors[field] = messages
            .filter((msg): msg is string => typeof msg === 'string')
            .map(sanitizeMessage);
        }
      }

      if (Object.keys(errors).length > 0) {
        return errors;
      }
    }
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
