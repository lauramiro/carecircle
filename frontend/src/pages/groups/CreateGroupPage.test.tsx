import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));
const supabaseMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
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

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: supabaseMock,
}));

function renderPage() {
  render(
    <MemoryRouter>
      <CreateGroupPage />
    </MemoryRouter>,
  );
}

async function fillRequiredFormFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/circle name/i), 'Mum Care Team');
  await user.type(screen.getByLabelText(/patient full name/i), 'Jane Doe');
  await user.type(screen.getByLabelText(/date of birth/i), '1955-05-01');
  await user.type(screen.getByLabelText(/^email\b/i), 'jane@example.com');
  await user.selectOptions(screen.getByLabelText(/relationship to the patient/i), 'parent');
}

function mockProfilesUpsertSuccess() {
  return {
    upsert: vi.fn().mockResolvedValue({ error: null }),
  };
}

function mockPatientInsertSuccess() {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'patient-123' },
          error: null,
        }),
      }),
    }),
  };
}

function mockCareGroupInsertSuccess(groupId = 'group-123') {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: groupId },
          error: null,
        }),
      }),
    }),
  };
}
// Import after mocks
import CreateGroupPage from './CreateGroupPage';

describe('CreateGroupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    });
    // Mock the Supabase chained calls
    supabaseMock.from.mockReturnValue(mockPatientInsertSuccess());
  });

  it('renders the create group form', () => {
    renderPage();
    expect(screen.getByText('Create a Care Circle')).toBeInTheDocument();
    expect(
      screen.getByText(/only fields marked with a red asterisk are required/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/circle name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/preferred group time zone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/patient full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/chronic conditions/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/relationship to the patient/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create circle/i })).toBeInTheDocument();
  });

  it('validates empty group name', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/patient full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/date of birth/i), '1955-05-01');
    await user.selectOptions(screen.getByLabelText(/relationship to the patient/i), 'parent');
    await user.click(screen.getByRole('button', { name: /create circle/i }));
    expect(screen.getByText('Group name is required.')).toBeInTheDocument();
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('validates group name minimum length', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/circle name/i), 'Ab');
    await user.type(screen.getByLabelText(/patient full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/date of birth/i), '1955-05-01');
    await user.selectOptions(screen.getByLabelText(/relationship to the patient/i), 'parent');
    await user.click(screen.getByRole('button', { name: /create circle/i }));
    expect(screen.getByText('Group name must be at least 3 characters.')).toBeInTheDocument();
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('validates empty patient full name', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/circle name/i), 'Mum Care Team');
    await user.type(screen.getByLabelText(/date of birth/i), '1955-05-01');
    await user.selectOptions(screen.getByLabelText(/relationship to the patient/i), 'parent');
    await user.click(screen.getByRole('button', { name: /create circle/i }));
    expect(screen.getByText("Patient's full name is required.")).toBeInTheDocument();
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('validates missing date of birth', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/circle name/i), 'Mum Care Team');
    await user.type(screen.getByLabelText(/patient full name/i), 'Jane Doe');
    await user.selectOptions(screen.getByLabelText(/relationship to the patient/i), 'parent');
    await user.click(screen.getByRole('button', { name: /create circle/i }));
    expect(screen.getByText('Date of birth is required.')).toBeInTheDocument();
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('validates missing relationship', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/circle name/i), 'Mum Care Team');
    await user.type(screen.getByLabelText(/patient full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/date of birth/i), '1955-05-01');
    await user.click(screen.getByRole('button', { name: /create circle/i }));
    expect(screen.getByText('Select your relationship to the patient.')).toBeInTheDocument();
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('navigates to groups list and shows success toast on success', async () => {
    const user = userEvent.setup();
    const careGiversInsert = vi.fn().mockResolvedValue({ error: null });
    supabaseMock.from
      .mockReturnValueOnce(mockProfilesUpsertSuccess())
      .mockReturnValueOnce(mockPatientInsertSuccess())
      .mockReturnValueOnce(mockCareGroupInsertSuccess())
      .mockReturnValueOnce({
        insert: careGiversInsert,
      })
      .mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

    renderPage();
    await fillRequiredFormFields(user);
    await user.click(screen.getByRole('button', { name: /create circle/i }));

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith('"Mum Care Team" care circle created!');
      expect(navigateMock).toHaveBeenCalledWith('/groups/list');
    });

    const careGroupInsert = supabaseMock.from.mock.results[2].value.insert;
    expect(careGroupInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Mum Care Team',
        primary_caregiver_id: 'test-user-id',
        preferred_timezone: expect.any(String),
      }),
    );
    expect(careGroupInsert.mock.calls[0][0]).not.toHaveProperty('patient_id');
    expect(careGroupInsert.mock.calls[0][0]).not.toHaveProperty('description');

    expect(careGiversInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        group_id: 'group-123',
        patient_id: 'patient-123',
        caregiver_id: 'test-user-id',
        relationship: 'parent',
        role_in_care: 'primary_carer',
        can_view_medical: true,
        can_schedule: true,
        can_communicate: true,
        status: 'active',
      }),
    );
    expect(typeof careGiversInsert.mock.calls[0][0].joined_at).toBe('string');
  });

  it('includes description on care_groups when provided', async () => {
    const user = userEvent.setup();
    const careGiversInsert = vi.fn().mockResolvedValue({ error: null });
    supabaseMock.from
      .mockReturnValueOnce(mockProfilesUpsertSuccess())
      .mockReturnValueOnce(mockPatientInsertSuccess())
      .mockReturnValueOnce(mockCareGroupInsertSuccess())
      .mockReturnValueOnce({
        insert: careGiversInsert,
      })
      .mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

    renderPage();
    await user.type(screen.getByLabelText(/circle name/i), 'Mum Care Team');
    await user.type(
      screen.getByLabelText(/^circle description/i),
      'Family coordination hub',
    );
    await user.type(screen.getByLabelText(/patient full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/date of birth/i), '1955-05-01');
    await user.type(screen.getByLabelText(/^email\b/i), 'jane@example.com');
    await user.selectOptions(screen.getByLabelText(/relationship to the patient/i), 'parent');
    await user.click(screen.getByRole('button', { name: /create circle/i }));

    await waitFor(() => {
      expect(careGiversInsert).toHaveBeenCalled();
    });

    const careGroupInsert = supabaseMock.from.mock.results[2].value.insert;
    expect(careGroupInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Mum Care Team',
        description: 'Family coordination hub',
        primary_caregiver_id: 'test-user-id',
        preferred_timezone: expect.any(String),
      }),
    );
    expect(careGroupInsert.mock.calls[0][0]).not.toHaveProperty('patient_id');
  });

  it('shows error toast when creation fails', async () => {
    const user = userEvent.setup();
    supabaseMock.from.mockReturnValueOnce(mockProfilesUpsertSuccess()).mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      }),
    });

    renderPage();
    await fillRequiredFormFields(user);
    await user.click(screen.getByRole('button', { name: /create circle/i }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalled();
    });
  });

  it('cancel button navigates to groups list', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(navigateMock).toHaveBeenCalledWith('/groups/list');
  });
});
