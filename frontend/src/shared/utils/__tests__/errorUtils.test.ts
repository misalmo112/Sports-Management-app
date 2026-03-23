/**
 * Tests for errorUtils
 */
import { describe, it, expect } from 'vitest';
import { AxiosError } from 'axios';
import {
  formatErrorMessage,
  extractValidationErrors,
  parseApiValidationEnvelope,
} from '../errorUtils';

describe('formatErrorMessage', () => {
  it('formats standard Error objects', () => {
    const error = new Error('Something went wrong');
    expect(formatErrorMessage(error)).toBe('Something went wrong');
  });

  it('handles network errors', () => {
    const error = new Error('Network Error');
    expect(formatErrorMessage(error)).toBe('Unable to connect to the server. Please check your internet connection.');
  });

  it('formats Axios errors with status codes', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 404,
        data: {},
      },
    } as unknown as AxiosError;
    
    expect(formatErrorMessage(error)).toBe('The requested resource was not found.');
  });

  it('formats Axios errors with detail message', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          detail: 'Invalid request data',
        },
      },
    } as unknown as AxiosError;
    
    expect(formatErrorMessage(error)).toBe('Invalid request data');
  });

  it('formats Axios errors with validation errors', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          errors: {
            email: ['Enter a valid email address'],
            name: ['This field is required'],
          },
        },
      },
    } as unknown as AxiosError;
    
    const message = formatErrorMessage(error);
    expect(message).toBe('Enter a valid email address');
  });

  it('handles unknown error types', () => {
    expect(formatErrorMessage(null)).toBe('An unexpected error occurred. Please try again.');
    expect(formatErrorMessage(undefined)).toBe('An unexpected error occurred. Please try again.');
    expect(formatErrorMessage('string error')).toBe('string error');
  });
});

describe('extractValidationErrors', () => {
  it('extracts validation errors from Axios error', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          errors: {
            email: ['Enter a valid email address'],
            name: ['This field is required'],
          },
        },
      },
    } as unknown as AxiosError;
    
    const errors = extractValidationErrors(error);
    expect(errors).toEqual({
      email: ['Enter a valid email address'],
      name: ['This field is required'],
    });
  });

  it('returns null when no validation errors', () => {
    const error = new Error('Some error');
    expect(extractValidationErrors(error)).toBeNull();
  });

  it('extracts field errors from global handler envelope (details)', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Please check the highlighted fields.',
          details: {
            allowed_modules: ['Invalid module key for staff.'],
            email: ['Enter a valid email address.'],
          },
        },
      },
    } as unknown as AxiosError;

    expect(extractValidationErrors(error)).toEqual({
      allowed_modules: ['Invalid module key for staff.'],
      email: ['Enter a valid email address.'],
    });
  });

  it('coerces string field values in details', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          details: { email: 'This email is already taken.' },
        },
      },
    } as unknown as AxiosError;

    expect(extractValidationErrors(error)).toEqual({
      email: ['This email is already taken.'],
    });
  });
});

describe('parseApiValidationEnvelope', () => {
  it('returns null for empty body', () => {
    expect(parseApiValidationEnvelope({})).toBeNull();
  });

  it('uses top-level message when no field keys', () => {
    expect(
      parseApiValidationEnvelope({
        status: 'error',
        message: 'Something went wrong.',
      }),
    ).toEqual({ non_field_errors: ['Something went wrong.'] });
  });
});
