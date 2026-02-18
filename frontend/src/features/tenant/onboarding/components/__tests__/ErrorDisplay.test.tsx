/**
 * Tests for ErrorDisplay component
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils/testUtils';
import { ErrorDisplay } from '../ErrorDisplay';

describe('ErrorDisplay', () => {
  it('renders nothing when no errors', () => {
    const { container } = render(<ErrorDisplay />);
    expect(container.firstChild).toBeNull();
  });

  it('displays error message', () => {
    const error = new Error('Test error message');
    render(<ErrorDisplay error={error} />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('displays API errors', () => {
    const apiErrors = {
      name: ['This field is required'],
      email: ['Enter a valid email address'],
    };
    
    render(<ErrorDisplay apiErrors={apiErrors} />);
    
    expect(screen.getByText(/name: This field is required/)).toBeInTheDocument();
    expect(screen.getByText(/email: Enter a valid email address/)).toBeInTheDocument();
  });

  it('displays custom title', () => {
    const error = new Error('Test error');
    render(<ErrorDisplay error={error} title="Validation Error" />);
    
    expect(screen.getByText('Validation Error')).toBeInTheDocument();
  });

  it('combines error and API errors', () => {
    const error = new Error('Network error');
    const apiErrors = {
      name: ['Required field'],
    };
    
    render(<ErrorDisplay error={error} apiErrors={apiErrors} />);
    
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText(/name: Required field/)).toBeInTheDocument();
  });
});
