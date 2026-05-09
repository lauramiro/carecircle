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

export async function inviteMember(payload: InvitePayload): Promise<InviteResult> {
  return groupsMock.inviteMember(payload);
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
