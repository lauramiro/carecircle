import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import InviteAcceptPanel from '../components/invite/InviteAcceptPanel';
import InviteLayout from '../components/invite/InviteLayout';
import ActionButton from '../components/ui/ActionButton';
import ToneIconBadge from '../components/ui/ToneIconBadge';
import { useAuth } from '../contexts/AuthContext';
import {
  acceptInvitation,
  fetchInviteGroupDetails,
  isEmailRegistered,
  isUserInInviteGroup,
  isValidInviteUuid,
  rejectInvitation,
} from '../services/inviteService';
import type { InviteState } from '../types/invite.types';
import { isValidEmail, maskEmail, isAbortError } from '../utils/helper';
import {
  buildMemberInvitePath,
  clearPendingInvite,
  savePendingInvite,
  type PendingInvite,
} from '../utils/inviteStorage';

const titleStyle: CSSProperties = {
  fontFamily: 'Lora, serif',
  fontSize: '26px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  letterSpacing: '-0.02em',
  margin: 0,
};

export default function InvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const [state, setState] = useState<InviteState>({
    type: 'loading',
    message: 'Checking your invitation...',
  });
  const [submitting, setSubmitting] = useState(false);

  const inviteId = (searchParams.get('inviteId') ?? '').trim();
  const email = (searchParams.get('email') ?? '').trim();
  const confirmationMode = searchParams.get('confirmation') === 'true';

  const invite = useMemo((): PendingInvite | null => {
    if (!email || !isValidEmail(email) || !isValidInviteUuid(inviteId)) return null;
    return { email, inviteId };
  }, [email, inviteId]);

  useEffect(() => {
    const ac = new AbortController();
    const { signal } = ac;

    async function resolveInvite() {
      if (!invite) {
        if (signal.aborted) return;
        setState({
          type: 'error',
          message: 'This invitation link is invalid or incomplete. Please ask for a new invite.',
        });
        return;
      }

      savePendingInvite(invite);

      const activeEmail = session?.user?.email;
      if (activeEmail && activeEmail.toLowerCase() !== invite.email.toLowerCase()) {
        if (signal.aborted) return;
        setState({
          type: 'error',
          message: `The active session is signed in as ${maskEmail(activeEmail)}, but this invite was sent to ${maskEmail(invite.email)}. Please log out first, then open the invite again with the invited email.`,
        });
        return;
      }

      if (!confirmationMode) {
        if (activeEmail) {
          if (signal.aborted) return;
          navigate(buildMemberInvitePath(invite, 'true'), { replace: true });
          return;
        }

        let registered: boolean;
        try {
          registered = await isEmailRegistered(invite.email, { signal });
        } catch (e) {
          if (signal.aborted || isAbortError(e)) return;
          throw e;
        }
        if (signal.aborted) return;
        navigate(registered ? '/login' : '/signup', { replace: true });
        return;
      }
      const group = await fetchInviteGroupDetails(invite.inviteId);
      const alreadyMember = await isUserInInviteGroup(
        group.groupId,
        group.patientId,
        session?.user?.id,
      );

      if (signal.aborted) return;
      if (alreadyMember) clearPendingInvite();
      setState({ type: 'confirmation', invite, group, alreadyMember });
    }

    void resolveInvite().catch(err => {
      if (signal.aborted || isAbortError(err)) return;
      setState({
        type: 'error',
        message: 'We could not load this invitation. Please try again.',
      });
    });

    return () => ac.abort();
  }, [confirmationMode, invite, navigate, session?.user?.email, session?.user?.id]);

  const handleAccept = async () => {
    if (state.type !== 'confirmation') return;

    setSubmitting(true);
    try {
      const { groupId } = await acceptInvitation(state.invite.inviteId, state.invite.email);
      clearPendingInvite();
      navigate(`/groups/${groupId}`);
    } catch {
      setState({
        type: 'error',
        message: 'We could not accept this invitation. Please try again.',
      });
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (state.type !== 'confirmation') return;
    setSubmitting(true);
    await rejectInvitation(state.invite.inviteId);
    clearPendingInvite();
    navigate('/');
  };

  if (state.type === 'loading') {
    return (
      <InviteLayout>
        <div className="text-center">
          <ToneIconBadge tone="primary" />
          <p style={titleStyle}>{state.message}</p>
        </div>
      </InviteLayout>
    );
  }

  if (state.type === 'error') {
    return (
      <InviteLayout>
        <div className="text-center">
          <ToneIconBadge tone="error" />
          <h1 style={titleStyle}>Invitation unavailable</h1>
          <p
            className="mt-2 mb-6"
            style={{
              fontSize: '15px',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.7,
            }}
          >
            {state.message}
          </p>
          <ActionButton onClick={() => navigate('/')}>Go home</ActionButton>
        </div>
      </InviteLayout>
    );
  }

  if (state.alreadyMember) {
    return (
      <InviteLayout>
        <div className="text-center">
          <ToneIconBadge tone="success" />
          <h1 style={titleStyle}>You are already a member</h1>
          <p
            className="mt-2 mb-6"
            style={{
              fontSize: '15px',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.7,
            }}
          >
            {state.invite.email} already belongs to <strong>{state.group.groupName}</strong>.
          </p>
          <ActionButton onClick={() => navigate(`/groups/${state.group.groupId}`)}>
            Go to group
          </ActionButton>
        </div>
      </InviteLayout>
    );
  }

  return (
    <InviteLayout>
      <InviteAcceptPanel
        groupName={state.group.groupName}
        description={state.group.description}
        totalCarers={state.group.totalCarers}
        inviteEmail={state.invite.email}
        submitting={submitting}
        onAccept={() => void handleAccept()}
        onReject={() => void handleReject()}
      />
    </InviteLayout>
  );
}
