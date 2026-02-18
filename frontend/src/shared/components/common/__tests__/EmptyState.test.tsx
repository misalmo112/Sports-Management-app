/**
 * Tests for EmptyState component
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('displays title', () => {
    render(<EmptyState title="No data found" />);
    expect(screen.getByText('No data found')).toBeInTheDocument();
  });

  it('displays description when provided', () => {
    render(
      <EmptyState
        title="No data found"
        description="Try adjusting your filters"
      />
    );
    expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
  });

  it('calls onAction when action button is clicked', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    
    render(
      <EmptyState
        title="No data found"
        actionLabel="Create Item"
        onAction={onAction}
      />
    );
    
    const actionButton = screen.getByText('Create Item');
    await user.click(actionButton);
    
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not show action button when onAction is not provided', () => {
    render(<EmptyState title="No data found" actionLabel="Create Item" />);
    expect(screen.queryByText('Create Item')).not.toBeInTheDocument();
  });

  it('renders as full page when fullPage is true', () => {
    const { container } = render(<EmptyState title="No data" fullPage />);
    expect(container.firstChild).toHaveClass('min-h-[400px]');
  });
});
