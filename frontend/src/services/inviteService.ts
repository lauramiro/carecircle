import { supabase } from '../lib/supabaseClient';
import { callRpc } from '../lib/supabaseRpc';
import { isAbortError } from '../utils/helper';

export interface InviteGroupDetails {
  groupId: string;
}

/** `invites.invite_type` value for care-group membership invites. */
export const INVITE_TYPES = {
  CARE_GROUP: 'care_group',
} as const;

/** `invites.status` — only pending invites are shown on the invite landing flow. */
export const INVITE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
} as const;

const INVITE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidInviteUuid(inviteId: string): boolean {
  return Boolean(inviteId.trim() && INVITE_ID_RE.test(inviteId));
}

function assertValidInviteUuid(inviteId: string): void {
  if (!isValidInviteUuid(inviteId)) {
    throw new Error('Invalid invitation link.');
  }
}

export async function isEmailRegistered(
  email: string,
  options?: { signal?: AbortSignal },
): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return false;

  try {
    const builder = supabase.rpc('is_email_registered', { p_email: normalizedEmail });
    const { data, error } =
      options?.signal !== undefined ? await builder.abortSignal(options.signal) : await builder;

    if (error) {
      console.error('isEmailRegistered:', error.message);
      return false;
    }

    return data === true;
  } catch (e) {
    if (options?.signal?.aborted || isAbortError(e)) {
      throw e;
    }
    console.error('isEmailRegistered:', e);
    return false;
  }
}

/**
 * Resolves the invite's target group id from the `invites` row alone.
 *
 * Deliberately does NOT read `care_group`/`patients` for a name/description
 * preview: RLS on those tables only grants SELECT to existing members, and
 * the invitee is by definition not a member yet, so any such read returns
 * null and previously caused this whole flow to fail with a generic error.
 */
export async function fetchInviteGroupDetails(inviteId: string): Promise<InviteGroupDetails> {
  const expiresAfter = new Date().toISOString();

  const { data: invite, error: inviteError } = await supabase
    .from('invites')
    .select('group_id')
    .eq('id', inviteId)
    .eq('invite_type', INVITE_TYPES.CARE_GROUP)
    .eq('status', INVITE_STATUS.PENDING)
    .gt('expires_at', expiresAfter)
    .maybeSingle();

  if (inviteError) {
    throw new Error(inviteError.message);
  }

  if (!invite) {
    throw new Error('Invitation not found or no longer valid.');
  }

  return { groupId: invite.group_id };
}

/**
 * Whether the signed-in user already has a `care_givers` row for this group.
 * @param careGiverId `auth.users.id` — when absent (logged out), returns false.
 */
export async function isUserInInviteGroup(
  groupId: string,
  careGiverId: string | undefined,
): Promise<boolean> {
  if (!groupId || !careGiverId) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('care_givers')
      .select('id')
      .eq('group_id', groupId)
      .eq('caregiver_id', careGiverId)
      .maybeSingle();

    if (error) {
      console.error('isUserInInviteGroup:', error.message);
      return false;
    }

    return data !== null;
  } catch (e) {
    console.error('isUserInInviteGroup:', e);
    return false;
  }
}

export async function acceptInvitation(inviteId: string, email: string): Promise<{ groupId: string }> {
  void email;
  assertValidInviteUuid(inviteId);

  const { data, error } = await callRpc<{ group_id?: string }>('update_invite_status', {
    p_invite_id: inviteId,
    p_status: INVITE_STATUS.ACCEPTED,
  });

  if (error) {
    throw new Error(error.message);
  }

  const groupId = data && typeof data === 'object' ? (data as { group_id?: unknown }).group_id : undefined;
  if (typeof groupId !== 'string') {
    throw new Error('Unexpected response from server.');
  }

  return { groupId };
}

export async function rejectInvitation(inviteId: string): Promise<void> {
  assertValidInviteUuid(inviteId);

  const { error } = await callRpc('update_invite_status', {
    p_invite_id: inviteId,
    p_status: INVITE_STATUS.REJECTED,
  });

  if (error) {
    console.error('rejectInvitation:', error.message);
  }
}

export async function isUserInGroup(groupId: string, email: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || user.email?.trim().toLowerCase() !== email.trim().toLowerCase()) {
    return false;
  }

  if (!INVITE_ID_RE.test(groupId)) {
    return false;
  }

  const { data, error } = await supabase.rpc('is_group_member', {
    check_group_id: groupId,
  });

  if (error) {
    console.error('isUserInGroup:', error.message);
    return false;
  }

  return data === true;
}