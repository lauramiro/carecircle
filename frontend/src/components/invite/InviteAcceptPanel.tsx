import { Users } from 'lucide-react';
import ActionButton from '../ui/ActionButton';

export default function InviteAcceptPanel({
  groupName,
  description,
  totalCarers,
  inviteEmail,
  submitting,
  onAccept,
  onReject,
}: {
  groupName: string;
  description: string;
  totalCarers: number;
  inviteEmail: string;
  submitting: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div>
      <div className="text-center mb-6">
        <div
          className="flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4"
          style={{ backgroundColor: 'var(--color-primary-light)' }}
        >
          <Users size={24} strokeWidth={1.75} style={{ color: 'var(--color-primary)' }} />
        </div>
        <h1
          style={{
            fontFamily: 'Lora, serif',
            fontSize: '26px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          Join {groupName}
        </h1>
        <p
          className="mt-2"
          style={{
            fontSize: '15px',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.7,
          }}
        >
          {description}
        </p>
        <p
          className="mt-2 mb-0"
          style={{
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
          }}
        >
          {totalCarers === 1 ? '1 carer' : `${totalCarers} carers`} already linked for this patient in
          this group.
        </p>
      </div>

      <div
        style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
        }}
      >
        <p
          className="mb-5"
          style={{
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.7,
            marginTop: 0,
          }}
        >
          This invitation is for <strong>{inviteEmail}</strong>. Accepting it will add you to the group
          and open the group dashboard.
        </p>
        <div className="flex flex-col gap-3">
          <ActionButton disabled={submitting} onClick={onAccept}>
            {submitting ? 'Accepting...' : 'Accept invitation'}
          </ActionButton>
          <ActionButton disabled={submitting} variant="secondary" onClick={onReject}>
            Reject invitation
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
