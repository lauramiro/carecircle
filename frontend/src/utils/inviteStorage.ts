const pendingInviteKey = 'carecircle:pendingInvite';

export interface PendingInvite {
  email: string;
  inviteId: string;
}

export function savePendingInvite(invite: PendingInvite) {
  localStorage.setItem(pendingInviteKey, JSON.stringify(invite));
}

export function getPendingInvite(): PendingInvite | null {
  const value = localStorage.getItem(pendingInviteKey);
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<PendingInvite>;
    if (!parsed.email || !parsed.inviteId) return null;
    return { email: parsed.email, inviteId: parsed.inviteId };
  } catch {
    return null;
  }
}

export function clearPendingInvite() {
  localStorage.removeItem(pendingInviteKey);
}

/** Member invite URL (query params; matches `/group-invite` + `InvitePage`) */
export function buildMemberInvitePath(invite: PendingInvite, confirmation: 'true' | 'false'): string {
  const params = new URLSearchParams({
    inviteId: invite.inviteId,
    email: invite.email,
    confirmation,
  });
  return `/group-invite?${params.toString()}`;
}

export function buildInviteConfirmationPath(invite: PendingInvite): string {
  return buildMemberInvitePath(invite, 'true');
}
