import { supabase } from '../../lib/supabaseClient';
import type {
  GPContact,
  Group,
  GroupSummary,
  InvitePayload,
  InviteResult,
} from './groups.types';
import * as groupsMock from './groups.mock';

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
    const userRole = item.role_in_care === 'Primary Carer' ? 'Admin' : 'Member';
    
    return {
      id: item.patient_id,
      name: `${item.patients.full_name}'s Care Circle`,
      description: item.patients.notes || `Care coordination group for ${item.patients.full_name}`,
      role: userRole,
      createdAt: item.joined_at || new Date().toISOString(),
      memberCount: 1, 
    };
  });
}

export async function getGroupById(groupId: string): Promise<Group | null> {
  return groupsMock.getGroupById(groupId);
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
