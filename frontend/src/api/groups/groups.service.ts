import { supabase } from '../../lib/supabaseClient';
import * as groupsMock from './groups.mock';
import type {
  GroupMember,
  GPContact,
  Group,
  GroupSummary,
  InvitePayload,
  InviteResult,
} from './groups.types';


export async function getGroups(): Promise<GroupSummary[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('care_group')
    .select(`
      patient_id,
      role_in_care,
      joined_at,
      patients!inner(
        full_name,
        notes
      )
    `)
    .eq('caregiver_id', user.id)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching groups:', error);
    throw new Error('Failed to load groups');
  }

  return data.map((item: any) => {
    
    return {
      id: item.patient_id,
      name: `${item.patients.full_name}'s Care Circle`,
      description: item.patients.notes || `Care coordination group for ${item.patients.full_name}`,
      role: item.role_in_care === 'Primary Carer' ? 'Admin' : 'Member',
      createdAt: item.joined_at || new Date().toISOString(),
      memberCount: 1, 
    };
  });
}

export async function getUserGroupDetails(patientId: string): Promise<Group | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Verify access and get group info based on the patient
  const { data: userGroupData, error: groupError } = await supabase
    .from('care_group')
    .select(`
      patient_id,
      role_in_care,
      joined_at,
      patients!inner(
        full_name,
        notes
      )
    `)
    .eq('patient_id', patientId)
    .eq('caregiver_id', user.id)
    .eq('status', 'active')
    .single();

  if (groupError || !userGroupData) {
    if (groupError?.code !== 'PGRST116') {
      console.error('Error fetching group data:', groupError);
    }
    return null;
  }

  // Fetch all members of this care circle
  const { data: membersData, error: membersError } = await supabase
    .from('care_group')
    .select(`
      caregiver_id,
      role_in_care,
      status,
      joined_at,
      profiles!inner(
        full_name
      )
    `)
    .eq('patient_id', patientId);

  if (membersError) {
    console.error('Error fetching members:', membersError);
  }

  const userRole = userGroupData.role_in_care === 'Primary Carer' ? 'Admin' : 'Member';

  const members: GroupMember[] = (membersData || []).map((m: any) => ({
    id: m.caregiver_id,
    name: m.profiles?.full_name || 'Unknown',
    email: m.profiles?.email || '', // Profiles might or might not have email depending on standard Supabase setup. If not, it'll gracefully be blank
    role: m.role_in_care === 'Primary Carer' ? 'Admin' : 'Member',
    joinedAt: m.joined_at || new Date().toISOString(),
    status: m.status === 'active' ? 'Active' : 'Suspended',
  }));

  return {
    id: userGroupData.patient_id,
    name: `${(userGroupData.patients as any).full_name || (userGroupData.patients as any)[0]?.full_name}'s Care Circle`,
    description: (userGroupData.patients as any).notes || (userGroupData.patients as any)[0]?.notes || `Care coordination group for ${(userGroupData.patients as any).full_name || (userGroupData.patients as any)[0]?.full_name}`,
    role: userRole as 'Admin' | 'Member',
    createdAt: userGroupData.joined_at || new Date().toISOString(),
    members,
    gpContacts: [] // Provide empty array as mock since Doctors/GPs relation isn't explicitly in schema yet
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
