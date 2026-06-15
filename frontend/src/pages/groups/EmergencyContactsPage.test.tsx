import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROLE } from '@typings/role-enum';
import EmergencyContactsPage from './EmergencyContactsPage';

const groupDetailMock = vi.hoisted(() => ({
  value: {
    group: {
      id: 'group-1',
      name: 'Dad Care Circle',
      role: 'secondary_carer',
    },
    loading: false,
    error: null as string | null,
  },
}));

const serviceMock = vi.hoisted(() => ({
  getEmergencyContacts: vi.fn(),
  addEmergencyContact: vi.fn(),
  updateEmergencyContact: vi.fn(),
  removeEmergencyContact: vi.fn(),
}));

vi.mock('../../hooks/groups/useGroupDetail', () => ({
  useGroupDetail: () => groupDetailMock.value,
}));

vi.mock('../../api/groups/groups.service', () => serviceMock);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/groups/group-1/emergency-contacts']}>
      <Routes>
        <Route
          path="/groups/:groupId/emergency-contacts"
          element={<EmergencyContactsPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EmergencyContactsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    groupDetailMock.value = {
      group: {
        id: 'group-1',
        name: 'Dad Care Circle',
        role: ROLE.SECONDARY_CAREGIVER,
      },
      loading: false,
      error: null,
    };
    serviceMock.getEmergencyContacts.mockResolvedValue([
      {
        id: 'gp:gp-1',
        name: 'Dr GP',
        role: 'GP',
        phoneNumber: '+44 111 111',
        source: 'gp',
        editable: false,
      },
      {
        id: 'free-1',
        name: 'Nora Neighbour',
        role: 'Neighbour',
        phoneNumber: '+44 222 222',
        source: 'free_form',
        editable: true,
      },
    ]);
  });

  it('renders one-tap call links for emergency contacts', async () => {
    renderPage();

    expect(await screen.findByText('Dr GP')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /call/i })[0]).toHaveAttribute(
      'href',
      'tel:+44111111',
    );
    expect(screen.getByText('Nora Neighbour')).toBeInTheDocument();
  });

  it('allows secondary carers to manage free-form contacts', async () => {
    renderPage();

    expect(await screen.findByText('Nora Neighbour')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('keeps observers read-only', async () => {
    groupDetailMock.value = {
      ...groupDetailMock.value,
      group: { ...groupDetailMock.value.group, role: ROLE.OBSERVER },
    };

    renderPage();

    expect(await screen.findByText('Nora Neighbour')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('shows cached contacts when refresh fails', async () => {
    serviceMock.getEmergencyContacts.mockRejectedValue(new Error('offline'));
    localStorage.setItem(
      'carecircle:emergencyContacts:group-1',
      JSON.stringify([
        {
          id: 'cached-1',
          name: 'Cached Contact',
          role: 'Emergency',
          phoneNumber: '+44 333 333',
          source: 'free_form',
          editable: true,
        },
      ]),
    );

    renderPage();

    expect(await screen.findByText('Cached Contact')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/showing cached contacts/i)).toBeInTheDocument(),
    );
  });
});
