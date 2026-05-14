const pendingInviteKey = 'carecircle:pendingInvite';
const INVITE_TTL_MS = 48 * 60 * 60 * 1000;

export interface PendingInvite {
  email: string;
  inviteId: string;
}

interface StoredInvite extends PendingInvite {
  savedAt: number;
}

export function savePendingInvite(invite: PendingInvite) {
  const stored: StoredInvite = { ...invite, savedAt: Date.now() };
  localStorage.setItem(pendingInviteKey, JSON.stringify(stored));
}

export function getPendingInvite(): PendingInvite | null {
  const value = localStorage.getItem(pendingInviteKey);
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<StoredInvite>;
    if (!parsed.email || !parsed.inviteId) return null;
    if (parsed.savedAt && Date.now() - parsed.savedAt > INVITE_TTL_MS) {
      localStorage.removeItem(pendingInviteKey);
      return null;
    }
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
  const params = new URLSearchParams({
    email: invite.email,
    inviteId: invite.inviteId,
    confirmation: 'true',
  });

  return `/invite?${params.toString()}`;
}
