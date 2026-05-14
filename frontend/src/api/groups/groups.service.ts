import { INVITE_TYPES } from '../../services/inviteService';
import { supabase } from '../../lib/supabaseClient';
import * as groupsMock from './groups.mock';
import type {
  GroupMember,
  GPContact,
  Group,
  GroupSummary,
  InvitePayload,
  InviteResult,
  GroupRole,
} from './groups.types';
import { ROLE } from '@typings/role-enum';

type GroupListQueryRow = {
  role_in_care: string | null;
  joined_at: string;
  care_group: {
    id: string;
    name: string | null;
    description: string | null;
    created_at: string | null;
  };
};

type GroupDetailMemberRow = {
  caregiver_id: string;
  role_in_care: string | null;
  status: string;
  joined_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

type GroupDetailQueryRow = {
  id: string;
  name: string | null;
  description: string | null;
  patient_id: string | null;
  created_at: string | null;
  care_givers: GroupDetailMemberRow[] | null;
};

export function mapRole(role: string): GroupRole {
  switch (role) {
    case ROLE.PRIMARY_CAREGIVER:
      return 'Admin';
    case ROLE.SECONDARY_CAREGIVER:
      return 'Member';
    case ROLE.OBSERVER:
      return 'Observer';
    default:
      return 'Member';
  }
}
export async function getGroups(): Promise<GroupSummary[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('care_givers')
    .select(`
      role_in_care,
      joined_at,
      care_group!inner (
        id,
        name,
        description,
        created_at
      )
    `)
    .eq('caregiver_id', user.id)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching groups:', error);
    throw new Error('Failed to load groups');
  }

  return (data as GroupListQueryRow[]).map(item => {
    return {
      id: item.care_group.id,
      name: item.care_group.name || 'Care Group',
      description: item.care_group.description || '',
      role: mapRole(item.role_in_care ?? ''),
      createdAt: item.care_group.created_at || item.joined_at || new Date().toISOString(),
      memberCount: 1, 
    };
  });
}

export async function getUserGroupDetails(groupId: string): Promise<Group | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Verify access 
  const { data: userMembership, error: membershipError } = await supabase
    .from('care_givers')
    .select('role_in_care, can_schedule')
    .eq('group_id', groupId)
    .eq('caregiver_id', user.id)
    .eq('status', 'active')
    .single();

  if (membershipError || !userMembership) {
    if (membershipError?.code !== 'PGRST116') {
      console.error('Error fetching membership data:', membershipError);
    }
    return null;
  }

  // Fetch group details and all members
  const { data: groupData, error: groupError } = await supabase
    .from('care_group')
    .select(`
      id,
      name,
      description,
      patient_id,
      created_at,
      care_givers (
        caregiver_id,
        role_in_care,
        status,
        joined_at,
        profiles (
          full_name,
          email
        )
      )
    `)
    .eq('id', groupId)
    .single();

  if (groupError || !groupData) {
    console.error('Error fetching members:', groupError);
    return null;
  }

  const g = groupData as GroupDetailQueryRow;
  const userRole = mapRole(userMembership.role_in_care ?? '');

  const members: GroupMember[] = (g.care_givers ?? []).map(m => ({
    id: m.caregiver_id,
    name: m.profiles?.full_name || 'Unknown',
    email: m.profiles?.email || '', 
    role: mapRole(m.role_in_care ?? ''),
    joinedAt: m.joined_at || new Date().toISOString(),
    status: m.status === 'active' ? 'Active' : 'Suspended',
  }));

  return {
    id: g.id,
    name: g.name ?? '',
    description: g.description || '',
    role: userRole,
    createdAt: g.created_at ?? new Date().toISOString(),
    members,
    gpContacts: [],
    patientId: g.patient_id ?? '',
  };
}

function parseCreateGroupInviteRow(data: unknown): InviteResult | null {
  if (data === null || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  const id = row.id;
  const groupId = row.group_id;
  const email = row.email;
  if (typeof id !== 'string' || typeof groupId !== 'string' || typeof email !== 'string') {
    return null;
  }
  return {
    inviteId: id,
    groupId,
    email,
  };
}

const GROUP_INVITE_EMAIL_FUNCTION = import.meta.env.VITE_GROUP_INVITE_EMAIL_FUNCTION || 'smooth-endpoint';

async function sendGroupInviteEmail(invite: InviteResult): Promise<void> {
  const { data, error } = await supabase.functions.invoke(GROUP_INVITE_EMAIL_FUNCTION, {
    body: {
      id: invite.inviteId,
      email: invite.email,
    },
  });

  if (error) {
    console.error('sendGroupInviteEmail:', error);
    throw new Error('Invite created, but email could not be sent');
  }

  if (!data || typeof data !== 'object' || (data as { success?: unknown }).success !== true) {
    const result = data as { error?: unknown } | null;
    const message = (result && typeof result.error === 'string')
      ? result.error
      : 'Invite created, but email could not be sent';
    throw new Error(message);
  }
}

export async function inviteMember(payload: InvitePayload): Promise<InviteResult> {
  const email = payload.email.trim().toLowerCase();
  if (!email) {
    throw new Error('Email is required');
  }

  const { data, error } = await supabase.rpc('create_group_invite', {
    p_email: email,
    p_group_id: payload.groupId,
    p_invite_type: INVITE_TYPES.CARE_GROUP,
  });

  if (error) {
    console.error('inviteMember:', error);
    throw new Error(error.message || 'Unable to send invite');
  }

  const parsed = parseCreateGroupInviteRow(data);
  if (!parsed) {
    throw new Error('Unable to send invite');
  }

  await sendGroupInviteEmail(parsed);

  return parsed;
}

export async function addGPContact(
  groupId: string,
  data: Omit<GPContact, 'id'>,
): Promise<GPContact> {
  return groupsMock.addGPContact(groupId, data);
}

export async function updateGPContact(
  groupId: string,
  gpId: string,
  data: Omit<GPContact, 'id'>,
): Promise<GPContact> {
  return groupsMock.updateGPContact(groupId, gpId, data);
}

export async function removeGPContact(groupId: string, gpId: string): Promise<void> {
  return groupsMock.removeGPContact(groupId, gpId);
}
