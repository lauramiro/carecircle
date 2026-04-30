import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InviteMemberModal from './InviteMemberModal';

const inviteHookMock = vi.hoisted(() => ({
  sendInvite: vi.fn(),
  inviting: false,
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../hooks/groups/useInviteMember', () => ({
  useInviteMember: () => ({
    inviting: inviteHookMock.inviting,
    sendInvite: inviteHookMock.sendInvite,
  }),
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

function renderModal(onClose = vi.fn()) {
  render(<InviteMemberModal groupId="group-care-001" open onClose={onClose} />);
  return onClose;
}

describe('InviteMemberModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inviteHookMock.inviting = false;
    inviteHookMock.sendInvite.mockResolvedValue(undefined);
  });

  it('validates empty email before submitting', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: /send invite/i }));

    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(inviteHookMock.sendInvite).not.toHaveBeenCalled();
  });

  it('validates invalid email before submitting', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText(/email address/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /send invite/i }));

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(inviteHookMock.sendInvite).not.toHaveBeenCalled();
  });

  it('closes when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = renderModal();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('sends invite and shows success toast', async () => {
    const user = userEvent.setup();
    const onClose = renderModal();

    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    await user.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() => {
      expect(inviteHookMock.sendInvite).toHaveBeenCalledWith('john@example.com');
    });
    expect(toastMock.success).toHaveBeenCalledWith('Invite sent to john@example.com');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows error toast when invite fails', async () => {
    const user = userEvent.setup();
    inviteHookMock.sendInvite.mockRejectedValue(new Error('Failed'));
    renderModal();

    await user.type(screen.getByLabelText(/email address/i), 'fail@example.com');
    await user.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Could not send invite. Please try again.');
    });
  });
});
