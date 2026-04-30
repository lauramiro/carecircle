import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardLayout from './DashboardLayout';

const authMock = vi.hoisted(() => ({
  signOut: vi.fn(),
  session: {
    user: {
      email: 'caregiver@example.com',
    },
  },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    session: authMock.session,
    signOut: authMock.signOut,
  }),
}));

function renderLayout(initialPath = '/dashboard') {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route path="dashboard" element={<div>Dashboard content</div>} />
          <Route path="groups/create" element={<div>Create group content</div>} />
          <Route path="groups/list" element={<div>Groups list content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('DashboardLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dashboard navigation and outlet content', () => {
    renderLayout();

    expect(screen.getByText('CareCircle')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /groups/i })).toBeInTheDocument();
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    expect(screen.getByText('caregiver@example.com')).toBeInTheDocument();
  });

  it('opens and closes the groups dropdown', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: /groups/i }));

    expect(screen.getByRole('link', { name: /create group/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /list groups/i })).toBeInTheDocument();

    await user.click(document.body);

    expect(screen.queryByRole('link', { name: /create group/i })).not.toBeInTheDocument();
  });

  it('closes the groups dropdown with escape', async () => {
    const user = userEvent.setup();
    renderLayout();

    const groupsButton = screen.getByRole('button', { name: /groups/i });
    await user.click(groupsButton);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('link', { name: /list groups/i })).not.toBeInTheDocument();
  });
});
