import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DashboardPage from './DashboardPage';

describe('DashboardPage', () => {
  it('shows the dashboard overview content', () => {
    render(<DashboardPage />);

    expect(screen.getByText('Good morning, Caregiver')).toBeInTheDocument();
    expect(screen.getByText(/overview of your care circles/i)).toBeInTheDocument();
    expect(screen.getByText('Active groups')).toBeInTheDocument();
    expect(screen.getByText('Pending invites')).toBeInTheDocument();
    expect(screen.getByText("Today's events")).toBeInTheDocument();
  });
});
