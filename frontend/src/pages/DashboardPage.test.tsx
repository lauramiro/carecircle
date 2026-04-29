import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './DashboardPage';

const authMock = vi.hoisted(() => ({
  signOut: vi.fn(),
  session: {
    user: {
      email: 'user@example.com',
    },
  },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    session: authMock.session,
    signOut: authMock.signOut,
  }),
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the dashboard content for the signed-in user', () => {
    render(<DashboardPage />);

    expect(screen.getByText('Welcome to CareCircle')).toBeInTheDocument();
    expect(screen.getByText(/signed in as/i)).toHaveTextContent('user@example.com');
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    expect(screen.getByText(/carecircle is a coordination tool/i)).toBeInTheDocument();
  });

  it('calls signOut when the user clicks the sign out button', async () => {
    const user = userEvent.setup();

    render(<DashboardPage />);

    await user.click(screen.getByRole('button', { name: /sign out/i }));

    expect(authMock.signOut).toHaveBeenCalledTimes(1);
  });
});
