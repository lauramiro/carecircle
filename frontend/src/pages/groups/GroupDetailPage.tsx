import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, Users, ClipboardList } from 'lucide-react';

import { toast } from 'react-toastify';
import type { GroupMember, GroupRole } from '../../api/groups/groups.types';
import GPContactSection from '../../components/groups/GPContactSection';
import GroupMembersTable from '../../components/groups/GroupMembersTable';
import GroupRoleBadge from '../../components/groups/GroupRoleBadge';
import InviteMemberModal from '../../components/groups/InviteMemberModal';
import MemberActionConfirmationModal from '../../components/groups/MemberActionConfirmationModal';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';
import { useGPContacts } from '../../hooks/groups/useGPContacts';
import { formatDate } from '../../utils/formatters';
import {
  CTA_ATTENTION_ANIMATION,
  STATIC_CTA_ATTENTION_ANIMATION,
  TRANSITIONS,
} from '../../lib/animation.constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';


type PendingMemberAction =
  | { type: 'remove'; member: GroupMember }
  | { type: 'role'; member: GroupMember; role: GroupRole }
  | { type: 'status'; member: GroupMember; status: GroupMember['status'] };

export default function GroupDetailPage() {
  const { groupId } = useParams();
  const { group, loading, error } = useGroupDetail(groupId);
  const {
    contacts: gpContacts,
    isSubmitting: gpContactSubmitting,
    addGP,
    updateGP,
    removeGP,
  } = useGPContacts(groupId ?? '', group?.gpContacts ?? []);
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [managedMembers, setManagedMembers] = useState<{
    groupId: string;
    members: GroupMember[];
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingMemberAction | null>(
    null,
  );

  if (!groupId) return <Navigate to="/groups/list" replace />;

  if (loading) {
    return (
      <section>
        <h1 className="text-2xl font-extrabold">Group Details</h1>
        <div
          className="mt-6 rounded-xl border bg-white p-6 text-sm"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Loading group details...
        </div>
      </section>
    );
  }

  if (error || !group) {
    return (
      <section>
        <h1 className="text-2xl font-extrabold">Group Details</h1>
        <div
          className="mt-6 rounded-xl border p-6 text-sm"
          style={{
            borderColor: 'var(--color-status-critical)',
            backgroundColor: 'var(--color-status-critical-bg)',
            color: 'var(--color-status-critical)',
          }}
        >
          {error ?? 'Group not found.'}
        </div>
      </section>
    );
  }

  const currentGroup = group;
  const members =
    managedMembers?.groupId === currentGroup.id
      ? managedMembers.members
      : currentGroup.members;
  const canInvite = members.length < 8;
  const canManageMembers = currentGroup.role === 'Admin';

  function getConfirmationCopy(action: PendingMemberAction | null) {
    if (!action) {
      return { title: '', message: '', confirmLabel: '' };
    }

    if (action.type === 'remove') {
      return {
        title: 'Remove member?',
        message: `${action.member.name} will lose access to this group and will need a new invite to join again.`,
        confirmLabel: 'Remove',
      };
    }

    if (action.type === 'role') {
      return {
        title: 'Change member role?',
        message: `${action.member.name} will be assigned the ${action.role} role in this group.`,
        confirmLabel: 'Change Role',
      };
    }

    return {
      title: action.status === 'Suspended' ? 'Suspend member?' : 'Reactivate member?',
      message:
        action.status === 'Suspended'
          ? `${action.member.name} will be suspended from this group until an admin reactivates them.`
          : `${action.member.name} will regain access to this group.`,
      confirmLabel: action.status === 'Suspended' ? 'Suspend' : 'Reactivate',
    };
  }

  function confirmPendingAction() {
    if (!pendingAction) return;

    if (pendingAction.type === 'remove') {
      setManagedMembers({
        groupId: currentGroup.id,
        members: members.filter((member) => member.id !== pendingAction.member.id),
      });
      toast.success(`${pendingAction.member.name} removed from group`);
    }

    if (pendingAction.type === 'role') {
      setManagedMembers({
        groupId: currentGroup.id,
        members: members.map((member) =>
          member.id === pendingAction.member.id
            ? { ...member, role: pendingAction.role }
            : member,
        ),
      });
      toast.success(`${pendingAction.member.name} is now ${pendingAction.role}`);
    }

    if (pendingAction.type === 'status') {
      setManagedMembers({
        groupId: currentGroup.id,
        members: members.map((member) =>
          member.id === pendingAction.member.id
            ? { ...member, status: pendingAction.status }
            : member,
        ),
      });
      toast.success(
        pendingAction.status === 'Suspended'
          ? `${pendingAction.member.name} suspended`
          : `${pendingAction.member.name} reactivated`,
      );
    }

    setPendingAction(null);
  }

  const confirmationCopy = getConfirmationCopy(pendingAction);

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1
            style={{
              color: 'var(--color-text-primary)',
              fontSize: '26px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            {currentGroup.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {currentGroup.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <motion.button
            type="button"
            onClick={() => navigate(`/groups/${currentGroup.id}/checklist`)}
            className="h-10 rounded-lg px-4 text-sm font-bold text-white"
            style={{
              backgroundColor: 'var(--color-primary)',
            }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
          >
            Daily checklist
          </motion.button>
          <motion.button
            type="button"
            onClick={() => navigate(`/groups/${currentGroup.id}/appointments`)}
            className="h-10 rounded-lg border px-4 text-sm font-bold"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
          >
            Appointments
          </motion.button>
          <motion.button
            type="button"
            onClick={() => navigate(`/groups/${currentGroup.id}/medications`)}
            className="h-10 rounded-lg border px-4 text-sm font-bold"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
          >
            View Schedule
          </motion.button>
          <motion.button
            type="button"
            onClick={() => navigate(`/groups/${currentGroup.id}/medications/add`)}
            className="h-10 rounded-lg border px-4 text-sm font-bold"
            style={{
              borderColor: 'var(--color-primary)',
              color: 'var(--color-primary)',
            }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
          >
            Add Medication
          </motion.button>
          {canInvite && (
            // A one-shot cue draws attention to the primary next action without looping.
            <motion.button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="h-10 rounded-lg px-4 text-sm font-bold text-white"
              style={{ backgroundColor: 'var(--color-primary)' }}
              animate={
                shouldReduceMotion
                  ? STATIC_CTA_ATTENTION_ANIMATION
                  : CTA_ATTENTION_ANIMATION
              }
              transition={{ ...TRANSITIONS.modal, delay: 0.35 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            >
              Invite Member
            </motion.button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

        <article
          className="rounded-xl border bg-white p-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <CalendarDays size={20} strokeWidth={1.9} color="var(--color-primary)" />
          <p className="mt-3 text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Created
          </p>
          <p className="mt-1 text-sm font-bold">{formatDate(currentGroup.createdAt)}</p>
        </article>

        <article
          className="rounded-xl border bg-white p-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Users size={20} strokeWidth={1.9} color="var(--color-primary)" />
          <p className="mt-3 text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Members
          </p>
          <p className="mt-1 text-sm font-bold">{members.length}</p>
        </article>

        <article
          className="rounded-xl border bg-white p-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Your Role
          </p>
          <div className="mt-3">
            <GroupRoleBadge role={currentGroup.role} />
          </div>
        </article>
      </div>

      {/* Today's Medications button */}
      <div className="mt-6 mb-2">
        <button
          type="button"
          onClick={() => navigate(`/groups/${currentGroup.id}/checklist`)}
          className="flex items-center gap-2 h-10 rounded-lg px-4 text-sm font-bold text-white"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <ClipboardList size={16} strokeWidth={1.9} />
          Today's Medications
        </button>
      </div>

      <GPContactSection
        groupId={currentGroup.id}
        gpContacts={gpContacts}
        userRole={currentGroup.role}
        isSubmitting={gpContactSubmitting}
        onAddGP={addGP}
        onUpdateGP={updateGP}
        onRemoveGP={removeGP}
      />

      <GroupMembersTable
        members={members}
        canManageMembers={canManageMembers}
        onRemoveMember={(member) => setPendingAction({ type: 'remove', member })}
        onRoleChange={(member, role) =>
          setPendingAction({ type: 'role', member, role })
        }
        onStatusChange={(member, status) =>
          setPendingAction({ type: 'status', member, status })
        }
      />

      <MemberActionConfirmationModal
        open={Boolean(pendingAction)}
        title={confirmationCopy.title}
        message={confirmationCopy.message}
        confirmLabel={confirmationCopy.confirmLabel}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
      />

      <InviteMemberModal
        groupId={currentGroup.id}
        groupName={currentGroup.name}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </section>
  );
}
