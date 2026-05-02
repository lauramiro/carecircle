export type GroupRole = 'Admin' | 'Member';
export type GroupMemberStatus = 'Active' | 'Suspended';

export interface GPContact {
  id: string;
  gpName?: string;
  phoneNumber?: string;
  practiceName?: string;
}

export interface GroupMember {
  id: string;
  name: string;
  email: string;
  role: GroupRole;
  joinedAt: string;
  status: GroupMemberStatus;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  role: GroupRole;
  createdAt: string;
  members: GroupMember[];
  gpContacts: GPContact[];
}

export interface GroupSummary {
  id: string;
  name: string;
  description: string;
  role: GroupRole;
  createdAt: string;
  memberCount: number;
}

export interface InvitePayload {
  groupId: string;
  email: string;
}

export interface InviteResult {
  inviteId: string;
  groupId: string;
  email: string;
}
