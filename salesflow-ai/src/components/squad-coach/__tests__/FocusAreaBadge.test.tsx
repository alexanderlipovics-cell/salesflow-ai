// ============================================================================
// FILE: src/components/squad-coach/__tests__/FocusAreaBadge.test.tsx
// DESCRIPTION: Unit tests for FocusAreaBadge component
// ============================================================================

import { render, screen } from '@testing-library/react';
import { FocusAreaBadge } from '../FocusAreaBadge';

describe('FocusAreaBadge', () => {
  it('renders with correct label', () => {
    render(<FocusAreaBadge focusArea="timing_help" />);
    expect(screen.getByText('Follow-up Disziplin')).toBeInTheDocument();
  });

  it('shows description when requested', () => {
    render(<FocusAreaBadge focusArea="script_help" showDescription />);
    expect(screen.getByText(/Viele Erstkontakte/)).toBeInTheDocument();
  });

  it('applies correct color class for timing_help', () => {
    const { container } = render(<FocusAreaBadge focusArea="timing_help" />);
    const badge = container.querySelector('.bg-red-500\\/10');
    expect(badge).toBeInTheDocument();
  });

  it('applies correct color class for script_help', () => {
    const { container } = render(<FocusAreaBadge focusArea="script_help" />);
    const badge = container.querySelector('.bg-orange-500\\/10');
    expect(badge).toBeInTheDocument();
  });

  it('applies correct color class for lead_quality', () => {
    const { container } = render(<FocusAreaBadge focusArea="lead_quality" />);
    const badge = container.querySelector('.bg-yellow-500\\/10');
    expect(badge).toBeInTheDocument();
  });

  it('applies correct color class for balanced', () => {
    const { container } = render(<FocusAreaBadge focusArea="balanced" />);
    const badge = container.querySelector('.bg-green-500\\/10');
    expect(badge).toBeInTheDocument();
  });

  it('renders icon correctly', () => {
    const { container } = render(<FocusAreaBadge focusArea="timing_help" />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});

