export interface InviteGroupDetails {
  groupId: string;
  groupName: string;
  description: string;
}

const registeredEmailsKey = 'carecircle:mockRegisteredEmails';
const groupMembershipsKey = 'carecircle:mockGroupMemberships';

function getStoredList(key: string): string[] {
  const value = localStorage.getItem(key);
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function getMembershipKey(groupId: string, email: string): string {
  return `${groupId}:${email.toLowerCase()}`;
}

export async function isEmailRegistered(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase();
  const storedEmails = getStoredList(registeredEmailsKey).map((storedEmail) => storedEmail.toLowerCase());

  return storedEmails.includes(normalizedEmail) || normalizedEmail.includes('registered');
}

export async function fetchInviteGroupDetails(inviteId: string): Promise<InviteGroupDetails> {
  const suffix = inviteId.slice(0, 8) || 'demo';

  return {
    groupId: `group-${suffix}`,
    groupName: 'CareCircle Family Group',
    description: 'A shared space for coordinating care tasks, updates, and support.',
  };
}

export async function isUserInInviteGroup(inviteId: string, email: string): Promise<boolean> {
  const group = await fetchInviteGroupDetails(inviteId);
  const memberships = getStoredList(groupMembershipsKey);

  return memberships.includes(getMembershipKey(group.groupId, email)) || inviteId.toLowerCase().includes('member');
}

export async function acceptInvitation(inviteId: string, email: string): Promise<{ groupId: string }> {
  const group = await fetchInviteGroupDetails(inviteId);
  const memberships = getStoredList(groupMembershipsKey);
  const membershipKey = getMembershipKey(group.groupId, email);

  if (!memberships.includes(membershipKey)) {
    localStorage.setItem(groupMembershipsKey, JSON.stringify([...memberships, membershipKey]));
  }

  return { groupId: group.groupId };
}

export async function rejectInvitation(): Promise<void> {
  return Promise.resolve();
}

export async function isUserInGroup(groupId: string, email: string): Promise<boolean> {
  const memberships = getStoredList(groupMembershipsKey);
  return memberships.includes(getMembershipKey(groupId, email));
}
