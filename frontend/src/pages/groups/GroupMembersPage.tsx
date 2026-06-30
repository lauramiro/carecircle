import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate, useParams } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { toast } from 'react-toastify';
import type { GroupMember } from '../../api/groups/groups.types';
import { removeMember, updateMemberRole, updateMemberStatus } from '../../api/groups/groups.service';
import { useAuth } from '../../contexts/AuthContext';
import { canManageMembers, canRemoveOrSuspendMember, validateMemberRoleChange } from '../../lib/carePermissions';
import { getCareRoleLabel } from '../../lib/careRole';
import { ROLE } from '@typings/role-enum';
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
  | { type: 'role'; member: GroupMember; role: ROLE }
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
      message: `${action.member.name} will be assigned the ${getCareRoleLabel(action.role)} role in this group.`,
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
  const { session } = useAuth();
  const { group, loading, error, refetch } = useGroupDetail(groupId);
  const shouldReduceMotion = useReducedMotion();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [managedMembers, setManagedMembers] = useState<{
    groupId: string;
    members: GroupMember[];
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingMemberAction | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

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
  const canInvite = canManageMembers(group.role) && members.length < 8;
  const canManageMembersFlag = canManageMembers(group.role);
  const currentUserId = session?.user?.id;
  const activeGroup = group;

  function handleRoleChange(member: GroupMember, role: ROLE) {
    if (!currentUserId) {
      toast.error('You must be signed in to change member roles.');
      return;
    }

    const validation = validateMemberRoleChange(
      activeGroup.role,
      currentUserId,
      member,
      role,
      members,
    );

    if (!validation.allowed) {
      toast.error(validation.reason ?? 'Unable to change member role.');
      return;
    }

    setPendingAction({ type: 'role', member, role });
  }

  function handleRemoveMember(member: GroupMember) {
    if (!canRemoveOrSuspendMember(currentUserId, member)) {
      toast.error('Primary carers cannot remove themselves from the group.');
      return;
    }

    setPendingAction({ type: 'remove', member });
  }

  function handleStatusChange(member: GroupMember, status: GroupMember['status']) {
    if (!canRemoveOrSuspendMember(currentUserId, member)) {
      toast.error('Primary carers cannot suspend themselves.');
      return;
    }

    setPendingAction({ type: 'status', member, status });
  }

  async function confirmPendingAction() {
    if (!pendingAction || isSubmittingAction || !group) return;

    const activeGroup = group;
    const activeMembers = members;

    if (pendingAction.type === 'role') {
      if (!currentUserId) {
        toast.error('You must be signed in to change member roles.');
        return;
      }

      const validation = validateMemberRoleChange(
        activeGroup.role,
        currentUserId,
        pendingAction.member,
        pendingAction.role,
        activeMembers,
      );

      if (!validation.allowed) {
        toast.error(validation.reason ?? 'Unable to change member role.');
        setPendingAction(null);
        return;
      }

      setIsSubmittingAction(true);

      try {
        await updateMemberRole(activeGroup.id, pendingAction.member.id, pendingAction.role);
        setManagedMembers({
          groupId: activeGroup.id,
          members: activeMembers.map((member) =>
            member.id === pendingAction.member.id
              ? { ...member, role: pendingAction.role }
              : member,
          ),
        });
        await refetch();
        toast.success(
          `${pendingAction.member.name} is now ${getCareRoleLabel(pendingAction.role)}`,
        );
        setPendingAction(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Unable to update member role.');
      } finally {
        setIsSubmittingAction(false);
      }

      return;
    }

    if (pendingAction.type === 'remove') {
      setIsSubmittingAction(true);
      try {
        await removeMember(activeGroup.id, pendingAction.member.id);
        setManagedMembers({
          groupId: activeGroup.id,
          members: activeMembers.filter((member) => member.id !== pendingAction.member.id),
        });
        await refetch();
        toast.success(`${pendingAction.member.name} removed from group`);
        setPendingAction(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Unable to remove member.');
      } finally {
        setIsSubmittingAction(false);
      }

      return;
    }

    if (pendingAction.type === 'status') {
      setIsSubmittingAction(true);
      try {
        await updateMemberStatus(activeGroup.id, pendingAction.member.id, pendingAction.status);
        setManagedMembers({
          groupId: activeGroup.id,
          members: activeMembers.map((member) =>
            member.id === pendingAction.member.id
              ? { ...member, status: pendingAction.status }
              : member,
          ),
        });
        await refetch();
        toast.success(
          pendingAction.status === 'Suspended'
            ? `${pendingAction.member.name} suspended`
            : `${pendingAction.member.name} reactivated`,
        );
        setPendingAction(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Unable to update member status.');
      } finally {
        setIsSubmittingAction(false);
      }

      return;
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
        currentUserId={currentUserId}
        canManageMembers={canManageMembersFlag}
        onRemoveMember={handleRemoveMember}
        onRoleChange={handleRoleChange}
        onStatusChange={handleStatusChange}
      />

      <MemberActionConfirmationModal
        open={Boolean(pendingAction)}
        title={confirmationCopy.title}
        message={confirmationCopy.message}
        confirmLabel={confirmationCopy.confirmLabel}
        isSubmitting={isSubmittingAction}
        onCancel={() => {
          if (!isSubmittingAction) setPendingAction(null);
        }}
        onConfirm={() => {
          void confirmPendingAction();
        }}
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
