/**
 * Tests for LoadingState component
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingState } from '../LoadingState';

describe('LoadingState', () => {
  it('renders loading spinner', () => {
    render(<LoadingState />);
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('displays message when provided', () => {
    render(<LoadingState message="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('renders as full page when fullPage is true', () => {
    const { container } = render(<LoadingState fullPage />);
    expect(container.firstChild).toHaveClass('min-h-[400px]');
  });

  it('renders inline when fullPage is false', () => {
    const { container } = render(<LoadingState fullPage={false} />);
    expect(container.firstChild).not.toHaveClass('min-h-[400px]');
  });
});
