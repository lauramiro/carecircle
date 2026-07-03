import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROLE } from '@typings/role-enum';

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

const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
}));

const authMock = vi.hoisted(() => ({
  session: {
    user: { id: 'primary-carer-1' },
  } as { user: { id: string } } | null,
  loading: false,
  signOut: vi.fn(),
}));

vi.mock('../../hooks/groups/useGroupDetail', () => ({
  useGroupDetail: () => groupDetailMock.value,
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authMock,
}));

vi.mock('../../api/groups/groups.service', () => serviceMock);

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

import EmergencyContactsPage from './EmergencyContactsPage';

function renderPage({ strict = false } = {}) {
  const page = <EmergencyContactsPage />;
  return render(
    <MemoryRouter initialEntries={['/groups/group-1/emergency-contacts']}>
      <Routes>
        <Route
          path="/groups/:groupId/emergency-contacts"
          element={strict ? <StrictMode>{page}</StrictMode> : page}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EmergencyContactsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    authMock.session = { user: { id: 'primary-carer-1' } };
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

  it('shows primary carer details even when phone is missing', async () => {
    serviceMock.getEmergencyContacts.mockResolvedValue([
      {
        id: 'primary-carer-1',
        name: 'Primary Carer',
        role: 'Primary carer',
        source: 'primary_carer',
        editable: false,
        ownerUserId: 'primary-carer-1',
      },
    ]);

    renderPage();

    expect(await screen.findByText('Primary Carer')).toBeInTheDocument();
    expect(screen.getByText('Phone number missing')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /add your phone number in settings/i })).toHaveAttribute(
      'href',
      '/settings',
    );
    expect(screen.queryByRole('link', { name: /call/i })).not.toBeInTheDocument();
  });

  it('does not show settings link when another user views a missing primary carer phone', async () => {
    authMock.session = { user: { id: 'other-user' } };
    serviceMock.getEmergencyContacts.mockResolvedValue([
      {
        id: 'primary-carer-1',
        name: 'Primary Carer',
        role: 'Primary carer',
        source: 'primary_carer',
        editable: false,
        ownerUserId: 'primary-carer-1',
      },
    ]);

    renderPage();

    expect(await screen.findByText('Phone number missing')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /add your phone number in settings/i })).not.toBeInTheDocument();
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

  it('shows only one load error toast when loading fails under strict mode', async () => {
    serviceMock.getEmergencyContacts.mockRejectedValue(new Error('offline'));

    renderPage({ strict: true });

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Emergency contacts could not be loaded');
    });
    expect(toastMock.error).toHaveBeenCalledTimes(1);
  });
});
