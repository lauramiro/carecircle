import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate, useParams } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { toast } from 'react-toastify';
import type { GroupMember, GroupRole } from '../../api/groups/groups.types';
import GroupMembersTable from '../../components/groups/GroupMembersTable';
import InviteMemberModal from '../../components/groups/InviteMemberModal';
import MemberActionConfirmationModal from '../../components/groups/MemberActionConfirmationModal';
import PageHeader from '../../components/ui/PageHeader';
import { ErrorPanel, LoadingPanel } from '../../components/ui/ContentPanel';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  CTA_ATTENTION_ANIMATION,
  STATIC_CTA_ATTENTION_ANIMATION,
  TRANSITIONS,
} from '../../lib/animation.constants';

type PendingMemberAction =
  | { type: 'remove'; member: GroupMember }
  | { type: 'role'; member: GroupMember; role: GroupRole }
  | { type: 'status'; member: GroupMember; status: GroupMember['status'] };

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

export default function GroupMembersPage() {
  const { groupId } = useParams();
  const { group, loading, error } = useGroupDetail(groupId);
  const shouldReduceMotion = useReducedMotion();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [managedMembers, setManagedMembers] = useState<{
    groupId: string;
    members: GroupMember[];
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingMemberAction | null>(null);

  if (!groupId) return <Navigate to="/groups/list" replace />;

  if (loading) {
    return (
      <section>
        <PageHeader title="Members" subtitle="Manage group access, roles, and member status." />
        <LoadingPanel message="Loading members..." />
      </section>
    );
  }

  if (error || !group) {
    return (
      <section>
        <PageHeader title="Members" subtitle="Manage group access, roles, and member status." />
        <ErrorPanel message={error ?? 'Group not found.'} />
      </section>
    );
  }

  const members =
    managedMembers?.groupId === group.id ? managedMembers.members : group.members;
  const canInvite = group.role === 'Admin' && members.length < 8;
  const canManageMembers = group.role === 'Admin';
  const currentGroupId = group.id;

  function confirmPendingAction() {
    if (!pendingAction) return;

    if (pendingAction.type === 'remove') {
      setManagedMembers({
        groupId: currentGroupId,
        members: members.filter((member) => member.id !== pendingAction.member.id),
      });
      toast.success(`${pendingAction.member.name} removed from group`);
    }

    if (pendingAction.type === 'role') {
      setManagedMembers({
        groupId: currentGroupId,
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
        groupId: currentGroupId,
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
      <PageHeader
        eyebrow="Care circle"
        title="Members"
        subtitle={`Manage who has access to ${group.name}, their roles, and member status.`}
        actions={
          canInvite ? (
            <motion.button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold text-white"
              style={{ backgroundColor: 'var(--color-primary)' }}
              animate={shouldReduceMotion ? STATIC_CTA_ATTENTION_ANIMATION : CTA_ATTENTION_ANIMATION}
              transition={{ ...TRANSITIONS.modal, delay: 0.35 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            >
              <UserPlus size={16} strokeWidth={2} />
              Invite member
            </motion.button>
          ) : undefined
        }
      />

      <GroupMembersTable
        embedded
        members={members}
        canManageMembers={canManageMembers}
        onRemoveMember={(member) => setPendingAction({ type: 'remove', member })}
        onRoleChange={(member, role) => setPendingAction({ type: 'role', member, role })}
        onStatusChange={(member, status) => setPendingAction({ type: 'status', member, status })}
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
        groupId={group.id}
        groupName={group.name}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </section>
  );
}
