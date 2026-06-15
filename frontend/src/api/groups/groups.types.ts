import { ROLE } from '@typings/role-enum';

export type GroupMemberStatus = 'Active' | 'Suspended';

export interface GPContact {
  id: string;
  gpName?: string;
  phoneNumber?: string;
  practiceName?: string;
  specialty?: string;
  email?: string;
}

export type EmergencyContactSource =
  | 'gp'
  | 'specialist'
  | 'primary_carer'
  | 'free_form';

export interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phoneNumber: string;
  source: EmergencyContactSource;
  editable: boolean;
}

export interface EmergencyContactFormData {
  name: string;
  role: string;
  phoneNumber: string;
}

export interface GroupMember {
  id: string;
  name: string;
  email: string;
  role: ROLE;
  joinedAt: string;
  status: GroupMemberStatus;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  role: ROLE;
  canSchedule: boolean;
  createdAt: string;
  members: GroupMember[];
  gpContacts: GPContact[];
  /** Care recipient / patient this circle manages — used for medication & log queries */
  patientId: string;
}

export interface GroupSummary {
  id: string;
  name: string;
  description: string;
  role: ROLE;
  createdAt: string;
  memberCount: number;
  patientId: string;
}

export interface InvitePayload {
  groupId: string;
  email: string;
  groupName: string;
}

export interface InviteResult {
  inviteId: string;
  groupId: string;
  email: string;
}
