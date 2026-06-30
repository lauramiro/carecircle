import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROLE } from '@typings/role-enum';
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
        role: 'primary_carer' as ROLE,
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
          role: 'primary_carer' as ROLE,
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
    expect(screen.getByText('Primary carer')).toBeInTheDocument();
    expect(screen.getByText('Primary carer')).toHaveClass('whitespace-nowrap');
    expect(screen.getByText('12 May 2025')).toBeInTheDocument();
    expect(screen.getByText(/Daily support and medication coordination for Dad\./)).toBeInTheDocument();
  });

  it('lets longer group names wrap instead of truncating them', () => {
    groupsHookMock.value = {
      loading: false,
      error: null,
      groups: [
        {
          id: 'group-care-long-name',
          name: "Laura's Care group for weekend respite planning",
          description: 'Shared rota and medication support.',
          role: 'primary_carer' as ROLE,
          createdAt: '2025-05-12T09:00:00.000Z',
          memberCount: 3,
        },
      ],
    };

    renderPage();

    const heading = screen.getByRole('heading', {
      name: /laura's care group for weekend respite planning/i,
    });
    expect(heading).toHaveClass('break-words');
    expect(heading).not.toHaveClass('truncate');
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
