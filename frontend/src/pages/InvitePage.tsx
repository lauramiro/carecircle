import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle, Heart, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  acceptInvitation,
  fetchInviteGroupDetails,
  isEmailRegistered,
  isUserInInviteGroup,
  rejectInvitation,
  type InviteGroupDetails,
} from '../services/inviteService';
import { isValidEmail, maskEmail } from '../utils/helper';
import {
  buildInviteConfirmationPath,
  clearPendingInvite,
  savePendingInvite,
  type PendingInvite,
} from '../utils/inviteStorage';

type InviteState =
  | { type: 'loading'; message: string }
  | { type: 'error'; message: string }
  | { type: 'confirmation'; invite: PendingInvite; group: InviteGroupDetails; alreadyMember: boolean };

function getInviteFromUrl(): PendingInvite | null {
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email')?.trim() ?? '';
  const inviteId = params.get('inviteId')?.trim() ?? '';

  if (!email || !isValidEmail(email) || !inviteId) return null;

  return { email, inviteId };
}

function isConfirmationMode(): boolean {
  return new URLSearchParams(window.location.search).get('confirmation') === 'true';
}

function navigateTo(path: string) {
  window.location.href = path;
}

function pageShell(children: ReactNode) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

function IconBadge({ tone }: { tone: 'primary' | 'error' | 'success' }) {
  const palette = {
    primary: {
      background: 'var(--color-primary-light)',
      color: 'var(--color-primary)',
      icon: Heart,
    },
    error: {
      background: 'var(--color-status-critical-bg)',
      color: 'var(--color-status-critical)',
      icon: AlertCircle,
    },
    success: {
      background: 'var(--color-status-given-bg)',
      color: 'var(--color-status-given)',
      icon: CheckCircle,
    },
  };
  const Icon = palette[tone].icon;

  return (
    <div
      className="flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4"
      style={{ backgroundColor: palette[tone].background }}
    >
      <Icon size={24} strokeWidth={1.75} style={{ color: palette[tone].color }} />
    </div>
  );
}

function ActionButton({
  children,
  disabled,
  onClick,
  variant = 'primary',
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        width: '100%',
        height: '44px',
        backgroundColor: variant === 'primary' ? 'var(--color-primary)' : 'var(--color-primary-light)',
        color: variant === 'primary' ? '#ffffff' : 'var(--color-primary-dark)',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 500,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  );
}

export default function InvitePage() {
  const { session } = useAuth();
  const [state, setState] = useState<InviteState>({
    type: 'loading',
    message: 'Checking your invitation...',
  });
  const [submitting, setSubmitting] = useState(false);

  const invite = useMemo(() => getInviteFromUrl(), []);
  const confirmationMode = useMemo(() => isConfirmationMode(), []);

  useEffect(() => {
    let cancelled = false;

    async function resolveInvite() {
      if (!invite) {
        setState({
          type: 'error',
          message: 'This invitation link is invalid or incomplete. Please ask for a new invite.',
        });
        return;
      }

      savePendingInvite(invite);

      const activeEmail = session?.user?.email;
      if (activeEmail && activeEmail.toLowerCase() !== invite.email.toLowerCase()) {
        setState({
          type: 'error',
          message: `The active session is signed in as ${maskEmail(activeEmail)}, but this invite was sent to ${maskEmail(invite.email)}. Please log out first, then open the invite again with the invited email.`,
        });
        return;
      }

      if (!confirmationMode) {
        if (activeEmail) {
          navigateTo(buildInviteConfirmationPath(invite));
          return;
        }

        const registered = await isEmailRegistered(invite.email);
        if (cancelled) return;
        navigateTo(registered ? '/login' : '/');
        return;
      }

      const [group, alreadyMember] = await Promise.all([
        fetchInviteGroupDetails(invite.inviteId),
        isUserInInviteGroup(invite.inviteId, invite.email),
      ]);

      if (!cancelled) {
        if (alreadyMember) clearPendingInvite();
        setState({ type: 'confirmation', invite, group, alreadyMember });
      }
    }

    resolveInvite().catch(() => {
      if (!cancelled) {
        setState({
          type: 'error',
          message: 'We could not load this invitation. Please try again.',
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [confirmationMode, invite, session?.user?.email]);

  const handleAccept = async () => {
    if (state.type !== 'confirmation') return;

    setSubmitting(true);
    try {
      const { groupId } = await acceptInvitation(state.invite.inviteId, state.invite.email);
      clearPendingInvite();
      navigateTo(`/group/${groupId}`);
    } catch {
      setState({
        type: 'error',
        message: 'We could not accept this invitation. Please try again.',
      });
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    await rejectInvitation();
    clearPendingInvite();
    navigateTo('/');
  };

  if (state.type === 'loading') {
    return pageShell(
      <div className="text-center">
        <IconBadge tone="primary" />
        <p style={{
          fontFamily: 'Lora, serif',
          fontSize: '26px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.02em',
          margin: 0,
        }}>
          {state.message}
        </p>
      </div>,
    );
  }

  if (state.type === 'error') {
    return pageShell(
      <div className="text-center">
        <IconBadge tone="error" />
        <h1 style={{
          fontFamily: 'Lora, serif',
          fontSize: '26px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.02em',
          margin: 0,
        }}>
          Invitation unavailable
        </h1>
        <p className="mt-2 mb-6" style={{
          fontSize: '15px',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.7,
        }}>
          {state.message}
        </p>
        <ActionButton onClick={() => navigateTo('/')}>Go home</ActionButton>
      </div>,
    );
  }

  if (state.alreadyMember) {
    return pageShell(
      <div className="text-center">
        <IconBadge tone="success" />
        <h1 style={{
          fontFamily: 'Lora, serif',
          fontSize: '26px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.02em',
          margin: 0,
        }}>
          You are already a member
        </h1>
        <p className="mt-2 mb-6" style={{
          fontSize: '15px',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.7,
        }}>
          {state.invite.email} already belongs to <strong>{state.group.groupName}</strong>.
        </p>
        <ActionButton onClick={() => navigateTo(`/group/${state.group.groupId}`)}>
          Go to group
        </ActionButton>
      </div>,
    );
  }

  return pageShell(
    <div>
      <div className="text-center mb-6">
        <div
          className="flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4"
          style={{ backgroundColor: 'var(--color-primary-light)' }}
        >
          <Users size={24} strokeWidth={1.75} style={{ color: 'var(--color-primary)' }} />
        </div>
        <h1 style={{
          fontFamily: 'Lora, serif',
          fontSize: '26px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.02em',
          margin: 0,
        }}>
          Join {state.group.groupName}
        </h1>
        <p className="mt-2" style={{
          fontSize: '15px',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.7,
        }}>
          {state.group.description}
        </p>
      </div>

      <div style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
      }}>
        <p className="mb-5" style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.7,
          marginTop: 0,
        }}>
          This invitation is for <strong>{state.invite.email}</strong>. Accepting it will add you
          to the group and open the group dashboard.
        </p>
        <div className="flex flex-col gap-3">
          <ActionButton disabled={submitting} onClick={handleAccept}>
            {submitting ? 'Accepting...' : 'Accept invitation'}
          </ActionButton>
          <ActionButton disabled={submitting} variant="secondary" onClick={handleReject}>
            Reject invitation
          </ActionButton>
        </div>
      </div>
    </div>,
  );
}
