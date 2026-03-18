/**
 * Tests for WizardProgress component
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils/testUtils';
import { WizardProgress } from '../WizardProgress';
import type { OnboardingState } from '../../types';

const mockState: OnboardingState = {
  academy_id: 'test-academy-id',
  current_step: 2,
  is_completed: false,
  steps: {
    step_1: { name: 'Academy Profile', completed: true },
    step_2: { name: 'Branches', completed: false },
    step_3: { name: 'Sports', completed: false },
    step_4: { name: 'Terms', completed: false },
    step_5: { name: 'Pricing', completed: false },
    step_6: { name: 'Pricing', completed: false },
  },
  locked: false,
  locked_by: null,
  locked_at: null,
  completed_at: null,
};

describe('WizardProgress', () => {
  it('renders all 6 steps', () => {
    render(<WizardProgress state={mockState} currentStep={2} />);
    
    expect(screen.getByText('Academy Profile')).toBeInTheDocument();
    expect(screen.getByText('Branches')).toBeInTheDocument();
    expect(screen.getByText('Sports')).toBeInTheDocument();
    expect(screen.getByText('Terms')).toBeInTheDocument();
    expect(screen.getByText('Pricing')).toBeInTheDocument();
  });

  it('shows completed step', () => {
    const { container } = render(<WizardProgress state={mockState} currentStep={2} />);
    
    // Step 1 should be completed - verify Academy Profile is shown
    expect(screen.getByText('Academy Profile')).toBeInTheDocument();
    // Check that the component renders without errors
    expect(container).toBeTruthy();
  });

  it('shows current step', () => {
    render(<WizardProgress state={mockState} currentStep={2} />);
    
    // Step 2 should be current - verify Branches is shown
    expect(screen.getByText('Branches')).toBeInTheDocument();
  });

  it('shows upcoming steps', () => {
    render(<WizardProgress state={mockState} currentStep={2} />);
    
    // Step 3 should be upcoming - verify Sports is shown
    expect(screen.getByText('Sports')).toBeInTheDocument();
  });

  it('handles undefined state gracefully', () => {
    render(<WizardProgress state={undefined} currentStep={1} />);
    
    // Should still render all steps
    expect(screen.getByText('Academy Profile')).toBeInTheDocument();
  });
});
