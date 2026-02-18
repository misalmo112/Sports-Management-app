/**
 * Tests for ErrorState component
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from '../ErrorState';

describe('ErrorState', () => {
  it('displays error message', () => {
    const error = new Error('Test error');
    render(<ErrorState error={error} />);
    expect(screen.getByText(/test error/i)).toBeInTheDocument();
  });

  it('displays custom title', () => {
    const error = new Error('Test error');
    render(<ErrorState error={error} title="Custom Error Title" />);
    expect(screen.getByText('Custom Error Title')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const error = new Error('Test error');
    
    render(<ErrorState error={error} onRetry={onRetry} />);
    
    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);
    
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show retry button when onRetry is not provided', () => {
    const error = new Error('Test error');
    render(<ErrorState error={error} />);
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('renders as full page when fullPage is true', () => {
    const error = new Error('Test error');
    const { container } = render(<ErrorState error={error} fullPage />);
    expect(container.firstChild).toHaveClass('min-h-[400px]');
  });
});
