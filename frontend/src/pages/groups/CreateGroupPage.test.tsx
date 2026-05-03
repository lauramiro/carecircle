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

// Import after mocks
import CreateGroupPage from './CreateGroupPage';

describe('CreateGroupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    });
    // Mock the Supabase chained calls
    supabaseMock.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'patient-123' },
            error: null,
          }),
        }),
      }),
    });
  });

  it('renders the create group form', () => {
    renderPage();
    expect(screen.getByText('Create a Care Circle')).toBeInTheDocument();
    expect(screen.getByLabelText(/circle name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create circle/i })).toBeInTheDocument();
  });

  it('validates empty group name', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /create circle/i }));
    expect(screen.getByText('Group name is required.')).toBeInTheDocument();
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('validates group name minimum length', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/circle name/i), 'Ab');
    await user.click(screen.getByRole('button', { name: /create circle/i }));
    expect(screen.getByText('Group name must be at least 3 characters.')).toBeInTheDocument();
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('navigates to groups list and shows success toast on success', async () => {
    const user = userEvent.setup();
    // Mock second insert (care_circle_members) to succeed
    supabaseMock.from
      .mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'patient-123' },
              error: null,
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

    renderPage();
    await user.type(screen.getByLabelText(/circle name/i), 'Mum Care Team');
    await user.click(screen.getByRole('button', { name: /create circle/i }));

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith('"Mum Care Team" care circle created!');
      expect(navigateMock).toHaveBeenCalledWith('/groups/list');
    });
  });

  it('shows error toast when creation fails', async () => {
    const user = userEvent.setup();
    supabaseMock.from.mockReturnValueOnce({
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
    await user.type(screen.getByLabelText(/circle name/i), 'Mum Care Team');
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