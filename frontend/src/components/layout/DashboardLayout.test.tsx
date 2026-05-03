import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
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

function renderLayout(
  initialEntries: string[] = ['/dashboard'],
  initialIndex = initialEntries.length - 1,
) {
  render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route
            path="dashboard"
            element={
              <div>
                Dashboard content
                <Link to="/groups/list">Open groups</Link>
              </div>
            }
          />
          <Route path="groups/create" element={<div>Create group content</div>} />
          <Route
            path="groups/list"
            element={
              <div>
                Groups list content
                <Link to="/groups/group-care-001">Open group detail</Link>
              </div>
            }
          />
          <Route path="groups/:groupId" element={<div>Group detail content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('DashboardLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('renders the dashboard navigation and outlet content', () => {
    renderLayout();

    expect(screen.getByText('CareCircle')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /groups/i })).toBeInTheDocument();
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    expect(screen.getByText('caregiver@example.com')).toBeInTheDocument();
  });

  it('shows a reusable back button away from the dashboard and navigates back', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('link', { name: /open groups/i }));

    await user.click(screen.getByRole('button', { name: /go back/i }));

    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go back/i })).toBeDisabled();
  });

  it('shows a reusable forward button and navigates forward', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('link', { name: /open groups/i }));
    await user.click(screen.getByRole('link', { name: /open group detail/i }));
    await user.click(screen.getByRole('button', { name: /go back/i }));

    await user.click(screen.getByRole('button', { name: /go forward/i }));

    expect(screen.getByText('Group detail content')).toBeInTheDocument();
  });

  it('disables history controls when there is no matching in-app history', () => {
    renderLayout(['/groups/list']);

    expect(screen.getByRole('button', { name: /go back/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /go forward/i })).toBeDisabled();
  });

  it('restores history controls from session storage after refresh', () => {
    window.sessionStorage.setItem(
      'carecircle:dashboard-history',
      JSON.stringify({
        entries: [
          { key: 'dashboard-key', url: '/dashboard' },
          { key: 'groups-key', url: '/groups/list' },
          { key: 'detail-key', url: '/groups/group-care-001' },
        ],
        index: 1,
        currentKey: 'groups-key',
        currentUrl: '/groups/list',
      }),
    );

    renderLayout(['/groups/list']);

    expect(screen.getByRole('button', { name: /go back/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /go forward/i })).toBeEnabled();
  });

  it('shows disabled history controls on the dashboard root', () => {
    renderLayout();

    expect(screen.getByRole('button', { name: /go back/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /go forward/i })).toBeDisabled();
  });

  it('opens and closes the groups dropdown', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: /groups/i }));

    expect(screen.getByRole('link', { name: /create group/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /list groups/i })).toBeInTheDocument();

    await user.click(document.body);

    await waitForElementToBeRemoved(() =>
      screen.queryByRole('link', { name: /create group/i }),
    );
  });

  it('closes the groups dropdown with escape', async () => {
    const user = userEvent.setup();
    renderLayout();

    const groupsButton = screen.getByRole('button', { name: /groups/i });
    await user.click(groupsButton);
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: /list groups/i })).not.toBeInTheDocument();
    });
  });
});
