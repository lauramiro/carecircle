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

function mapRole(role: string): GroupRole {
  return role === 'Primary Carer' ? 'Admin' : 'Member';
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
    .eq('care_giver_id', user.id)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching groups:', error);
    throw new Error('Failed to load groups');
  }

  return data.map((item: any) => {
    return {
      id: item.care_group.id,
      name: item.care_group.name || 'Care Group',
      description: item.care_group.description || '',
      role: item.role_in_care === 'Primary Carer' ? 'Admin' : 'Member',
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
    .select('role_in_care')
    .eq('group_id', groupId)
    .eq('care_giver_id', user.id)
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
        care_giver_id,
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

  const userRole = mapRole(userMembership.role_in_care);

  const members: GroupMember[] = (groupData.care_givers || []).map((m: any) => ({
    id: m.care_giver_id,
    name: m.profiles.full_name,
    email: m.profiles.email, 
    role: mapRole(m.role_in_care),
    joinedAt: m.joined_at,
    status: m.status === 'active' ? 'Active' : 'Suspended',
  }));

  return {
    id: groupData.id,
    name: groupData.name,
    description: groupData.description || '',
    role: userRole,
    createdAt: groupData.created_at,
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
