import type { GPContact, Group, GroupSummary } from './groups.types';

const mockGroups: Group[] = [
  {
    id: 'group-care-001',
    patientId: 'patient-mock-001',
    name: 'Dad Care Circle',
    description: 'Daily support and medication coordination for Dad.',
    role: 'Admin',
    canSchedule: true,
    createdAt: '2025-05-12T09:00:00.000Z',
    members: [
      { id: 'member-1', name: 'Sarah Cole', email: 'sarah@example.com', role: 'Admin', joinedAt: '2025-05-12T09:00:00.000Z', status: 'Active' },
      { id: 'member-2', name: 'John Smith', email: 'john@example.com', role: 'Member', joinedAt: '2025-05-13T10:20:00.000Z', status: 'Active' },
      { id: 'member-3', name: 'Mike Cole', email: 'mike@example.com', role: 'Member', joinedAt: '2025-05-15T15:45:00.000Z', status: 'Suspended' },
    ],
    gpContacts: [
      {
        id: 'gp-001',
        gpName: 'Dr. Helen Carter',
        phoneNumber: '+44 20 7946 0123',
        practiceName: 'Northside Family Practice',
      },
      {
        id: 'gp-002',
        gpName: 'Dr. Samuel Patel',
        phoneNumber: '020 7946 0188',
        practiceName: 'Carewell Medical Centre',
      },
    ],
  },
  {
    id: 'group-care-002',
    patientId: 'patient-mock-002',
    name: 'Mum Recovery Team',
    description: 'Post-surgery care planning and appointment tracking.',
    role: 'Member',
    canSchedule: true,
    createdAt: '2025-04-28T13:30:00.000Z',
    members: [
      { id: 'member-4', name: 'Amara Benson', email: 'amara@example.com', role: 'Admin', joinedAt: '2025-04-28T13:30:00.000Z', status: 'Active' },
      { id: 'member-5', name: 'Sarah Cole', email: 'sarah@example.com', role: 'Member', joinedAt: '2025-04-29T09:15:00.000Z', status: 'Active' },
      { id: 'member-6', name: 'Grace Benson', email: 'grace@example.com', role: 'Member', joinedAt: '2025-04-30T14:10:00.000Z', status: 'Active' },
      { id: 'member-7', name: 'Eve Benson', email: 'eve@example.com', role: 'Member', joinedAt: '2025-05-01T08:40:00.000Z', status: 'Active' },
    ],
    gpContacts: [
      {
        id: 'gp-003',
        gpName: 'Dr. Aisha Morgan',
        phoneNumber: '+44 161 555 0148',
        practiceName: 'Riverside Health Clinic',
      },
    ],
  },
  {
    id: 'group-care-003',
    patientId: 'patient-mock-003',
    name: 'Grandpa Wellness',
    description: 'Weekly wellness checks and shared notes for Grandpa.',
    role: 'Admin',
    canSchedule: true,
    createdAt: '2025-03-19T11:45:00.000Z',
    members: [
      { id: 'member-8', name: 'Sarah Cole', email: 'sarah@example.com', role: 'Admin', joinedAt: '2025-03-19T11:45:00.000Z', status: 'Active' },
      { id: 'member-9', name: 'Daniel Cole', email: 'daniel@example.com', role: 'Member', joinedAt: '2025-03-20T12:30:00.000Z', status: 'Active' },
    ],
    gpContacts: [],
  },
  {
    id: 'group-care-004',
    patientId: 'patient-mock-004',
    name: 'Aunt May Support',
    description: 'Care shift coordination for Aunt May and her neighbours.',
    role: 'Member',
    canSchedule: true,
    createdAt: '2025-02-05T08:15:00.000Z',
    members: [
      { id: 'member-10', name: 'May Johnson', email: 'may@example.com', role: 'Admin', joinedAt: '2025-02-05T08:15:00.000Z', status: 'Active' },
      { id: 'member-11', name: 'Sarah Cole', email: 'sarah@example.com', role: 'Member', joinedAt: '2025-02-06T11:15:00.000Z', status: 'Active' },
      { id: 'member-12', name: 'Tina Johnson', email: 'tina@example.com', role: 'Member', joinedAt: '2025-02-07T13:25:00.000Z', status: 'Active' },
      { id: 'member-13', name: 'Paul Johnson', email: 'paul@example.com', role: 'Member', joinedAt: '2025-02-08T16:50:00.000Z', status: 'Active' },
      { id: 'member-14', name: 'Helen Johnson', email: 'helen@example.com', role: 'Member', joinedAt: '2025-02-09T10:05:00.000Z', status: 'Suspended' },
    ],
    gpContacts: [],
  },
  {
    id: 'group-care-005',
    patientId: 'patient-mock-005',
    name: 'Medication Helpers',
    description: 'Shared medication reminders across the family.',
    role: 'Admin',
    canSchedule: true,
    createdAt: '2025-01-21T16:10:00.000Z',
    members: [
      { id: 'member-15', name: 'Sarah Cole', email: 'sarah@example.com', role: 'Admin', joinedAt: '2025-01-21T16:10:00.000Z', status: 'Active' },
      { id: 'member-16', name: 'Nora Cole', email: 'nora@example.com', role: 'Member', joinedAt: '2025-01-22T09:00:00.000Z', status: 'Active' },
      { id: 'member-17', name: 'Ivy Cole', email: 'ivy@example.com', role: 'Member', joinedAt: '2025-01-23T09:00:00.000Z', status: 'Active' },
      { id: 'member-18', name: 'Leo Cole', email: 'leo@example.com', role: 'Member', joinedAt: '2025-01-24T09:00:00.000Z', status: 'Active' },
      { id: 'member-19', name: 'Zoe Cole', email: 'zoe@example.com', role: 'Member', joinedAt: '2025-01-25T09:00:00.000Z', status: 'Active' },
      { id: 'member-20', name: 'Adam Cole', email: 'adam@example.com', role: 'Member', joinedAt: '2025-01-26T09:00:00.000Z', status: 'Active' },
      { id: 'member-21', name: 'Rose Cole', email: 'rose@example.com', role: 'Member', joinedAt: '2025-01-27T09:00:00.000Z', status: 'Active' },
      { id: 'member-22', name: 'Ben Cole', email: 'ben@example.com', role: 'Member', joinedAt: '2025-01-28T09:00:00.000Z', status: 'Active' },
    ],
    gpContacts: [],
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
    patientId: group.patientId,
  };
}

export async function getGroups(): Promise<GroupSummary[]> {
  return delay(mockGroups.map(toSummary));
}

export async function getUserGroupDetails(groupId: string): Promise<Group | null> {
  return delay(mockGroups.find((group) => group.id === groupId) ?? null);
}

function findMockGroup(groupId: string): Group {
  const group = mockGroups.find((currentGroup) => currentGroup.id === groupId);

  if (!group) {
    throw new Error('Group not found');
  }

  return group;
}

export async function addGPContact(
  groupId: string,
  data: Omit<GPContact, 'id'>,
): Promise<GPContact> {
  const group = findMockGroup(groupId);
  const contact: GPContact = {
    id: `gp-${groupId}-${Date.now()}`,
    ...data,
  };

  group.gpContacts = [...group.gpContacts, contact];

  return delay(contact);
}

export async function updateGPContact(
  groupId: string,
  gpId: string,
  data: Omit<GPContact, 'id'>,
): Promise<GPContact> {
  const group = findMockGroup(groupId);
  const contact = group.gpContacts.find((gpContact) => gpContact.id === gpId);

  if (!contact) {
    throw new Error('GP contact not found');
  }

  const updatedContact: GPContact = { id: gpId, ...data };
  group.gpContacts = group.gpContacts.map((gpContact) =>
    gpContact.id === gpId ? updatedContact : gpContact,
  );

  return delay(updatedContact);
}

export async function removeGPContact(groupId: string, gpId: string): Promise<void> {
  const group = findMockGroup(groupId);
  group.gpContacts = group.gpContacts.filter((gpContact) => gpContact.id !== gpId);

  return delay(undefined);
}
