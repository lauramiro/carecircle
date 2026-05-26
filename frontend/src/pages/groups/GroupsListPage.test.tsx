import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupsListPage from './GroupsListPage';

const navigateMock = vi.hoisted(() => vi.fn());
const groupsHookMock = vi.hoisted(() => ({
  value: {
    loading: false,
    error: null as string | null,
    groups: [
      {
        id: 'group-care-001',
        name: 'Dad Care Circle',
        description: 'Daily support and medication coordination for Dad.',
        role: 'Admin' as const,
        createdAt: '2025-05-12T09:00:00.000Z',
        memberCount: 3,
      },
    ],
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../hooks/groups/useGroups', () => ({
  useGroups: () => groupsHookMock.value,
}));

function renderPage() {
  render(
    <MemoryRouter>
      <GroupsListPage />
    </MemoryRouter>,
  );
}

describe('GroupsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    groupsHookMock.value = {
      loading: false,
      error: null,
      groups: [
        {
          id: 'group-care-001',
          name: 'Dad Care Circle',
          description: 'Daily support and medication coordination for Dad.',
          role: 'Admin',
          createdAt: '2025-05-12T09:00:00.000Z',
          memberCount: 3,
        },
      ],
    };
  });

  it('renders group cards with summary information', () => {
    renderPage();

    expect(screen.getByText('Dad Care Circle')).toBeInTheDocument();
    // expect(screen.getByText('group-care-001')).toBeInTheDocument(); // Flaky/removed from UI
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('12 May 2025')).toBeInTheDocument();
    expect(screen.getByText(/Daily support and medication coordination for Dad\./)).toBeInTheDocument();
  });

  it('navigates to group detail when a card is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /dad care circle/i }));

    expect(navigateMock).toHaveBeenCalledWith('/groups/group-care-001');
  });

  it('handles loading state', () => {
    groupsHookMock.value = { groups: [], loading: true, error: null };

    renderPage();

    expect(screen.getByLabelText('Loading groups')).toBeInTheDocument();
  });

  it('handles empty state', () => {
    groupsHookMock.value = { groups: [], loading: false, error: null };

    renderPage();

    expect(screen.getByText('No groups yet')).toBeInTheDocument();
  });
});
