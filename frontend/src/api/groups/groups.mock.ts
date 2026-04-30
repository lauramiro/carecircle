import type { Group, GroupSummary, InvitePayload, InviteResult } from './groups.types';

const mockGroups: Group[] = [
  {
    id: 'group-care-001',
    name: 'Dad Care Circle',
    description: 'Daily support and medication coordination for Dad.',
    role: 'Admin',
    createdAt: '2025-05-12T09:00:00.000Z',
    members: [
      { id: 'member-1', name: 'Sarah Cole', email: 'sarah@example.com', role: 'Admin' },
      { id: 'member-2', name: 'John Smith', email: 'john@example.com', role: 'Member' },
      { id: 'member-3', name: 'Mike Cole', email: 'mike@example.com', role: 'Member' },
    ],
  },
  {
    id: 'group-care-002',
    name: 'Mum Recovery Team',
    description: 'Post-surgery care planning and appointment tracking.',
    role: 'Member',
    createdAt: '2025-04-28T13:30:00.000Z',
    members: [
      { id: 'member-4', name: 'Amara Benson', email: 'amara@example.com', role: 'Admin' },
      { id: 'member-5', name: 'Sarah Cole', email: 'sarah@example.com', role: 'Member' },
      { id: 'member-6', name: 'Grace Benson', email: 'grace@example.com', role: 'Member' },
      { id: 'member-7', name: 'Eve Benson', email: 'eve@example.com', role: 'Member' },
    ],
  },
  {
    id: 'group-care-003',
    name: 'Grandpa Wellness',
    description: 'Weekly wellness checks and shared notes for Grandpa.',
    role: 'Admin',
    createdAt: '2025-03-19T11:45:00.000Z',
    members: [
      { id: 'member-8', name: 'Sarah Cole', email: 'sarah@example.com', role: 'Admin' },
      { id: 'member-9', name: 'Daniel Cole', email: 'daniel@example.com', role: 'Member' },
    ],
  },
  {
    id: 'group-care-004',
    name: 'Aunt May Support',
    description: 'Care shift coordination for Aunt May and her neighbours.',
    role: 'Member',
    createdAt: '2025-02-05T08:15:00.000Z',
    members: [
      { id: 'member-10', name: 'May Johnson', email: 'may@example.com', role: 'Admin' },
      { id: 'member-11', name: 'Sarah Cole', email: 'sarah@example.com', role: 'Member' },
      { id: 'member-12', name: 'Tina Johnson', email: 'tina@example.com', role: 'Member' },
      { id: 'member-13', name: 'Paul Johnson', email: 'paul@example.com', role: 'Member' },
      { id: 'member-14', name: 'Helen Johnson', email: 'helen@example.com', role: 'Member' },
    ],
  },
  {
    id: 'group-care-005',
    name: 'Medication Helpers',
    description: 'Shared medication reminders across the family.',
    role: 'Admin',
    createdAt: '2025-01-21T16:10:00.000Z',
    members: [
      { id: 'member-15', name: 'Sarah Cole', email: 'sarah@example.com', role: 'Admin' },
      { id: 'member-16', name: 'Nora Cole', email: 'nora@example.com', role: 'Member' },
      { id: 'member-17', name: 'Ivy Cole', email: 'ivy@example.com', role: 'Member' },
      { id: 'member-18', name: 'Leo Cole', email: 'leo@example.com', role: 'Member' },
      { id: 'member-19', name: 'Zoe Cole', email: 'zoe@example.com', role: 'Member' },
      { id: 'member-20', name: 'Adam Cole', email: 'adam@example.com', role: 'Member' },
      { id: 'member-21', name: 'Rose Cole', email: 'rose@example.com', role: 'Member' },
      { id: 'member-22', name: 'Ben Cole', email: 'ben@example.com', role: 'Member' },
    ],
  },
];

function delay<T>(value: T, timeoutMs = 250): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), timeoutMs);
  });
}

function toSummary(group: Group): GroupSummary {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    role: group.role,
    createdAt: group.createdAt,
    memberCount: group.members.length,
  };
}

export async function getGroups(): Promise<GroupSummary[]> {
  return delay(mockGroups.map(toSummary));
}

export async function getGroupById(groupId: string): Promise<Group | null> {
  return delay(mockGroups.find((group) => group.id === groupId) ?? null);
}

export async function inviteMember(payload: InvitePayload): Promise<InviteResult> {
  if (payload.email.toLowerCase().includes('fail')) {
    throw new Error('Unable to send invite');
  }

  return delay({
    inviteId: `invite-${payload.groupId}-${Date.now()}`,
    groupId: payload.groupId,
    email: payload.email,
  });
}
