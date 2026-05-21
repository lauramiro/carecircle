import axios from 'axios';
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

type CareGiverMembershipRow = {
  role_in_care: string | null;
  can_schedule: boolean | null;
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

  const membership = userMembership as CareGiverMembershipRow;

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

  const userRole = mapRole(membership.role_in_care);
  const canSchedule = membership.can_schedule === true;

  const members: GroupMember[] = (groupData.care_givers ?? []).map(m => ({
    id: m.caregiver_id,
    name: m.profiles?.full_name || 'Unknown',
    email: m.profiles.email,
    role: mapRole(m.role_in_care),
    joinedAt: m.joined_at,
    status: m.status === 'active' ? 'Active' : 'Suspended',
  }));

  return {
    id: groupData.id,
    name: groupData.name,
    description: groupData.description ?? '',
    role: userRole,
    createdAt: groupData.created_at ?? new Date().toISOString(),
    canSchedule,
    members,
    gpContacts: [],
    patientId: groupData.patient_id,
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

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

async function sendGroupInviteEmail(invite: InviteResult, groupName: string): Promise<void> {
  try {
    await axios.post(
      `${apiBaseUrl}/api/invites/group/send-email`,
      {
        inviteId: invite.inviteId,
        groupId: invite.groupId,
        email: invite.email,
        groupName: groupName.trim(),
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const data = err.response?.data;
      const messageFromBody =
        typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        Array.isArray((data as { message?: unknown }).message)
          ? String((data as { message: string[] }).message[0])
          : typeof data === 'object' &&
              data !== null &&
              'message' in data &&
              typeof (data as { message?: unknown }).message === 'string'
            ? String((data as { message: string }).message)
            : null;
      console.error('sendGroupInviteEmail:', err.response?.data ?? err.message);
      throw new Error(messageFromBody || 'Invite created, but email could not be sent', {
        cause: err,
      });
    }
    console.error('sendGroupInviteEmail:', err);
    throw new Error('Invite created, but email could not be sent', { cause: err });
  }
}

export async function inviteMember(payload: InvitePayload): Promise<InviteResult> {
  const email = payload.email.trim().toLowerCase();
  if (!email) {
    throw new Error('Email is required');
  }
  const groupName = payload.groupName.trim();
  if (!groupName) {
    throw new Error('Group name is required');
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

  await sendGroupInviteEmail(parsed, groupName);

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