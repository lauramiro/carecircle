import axios from 'axios';
import { INVITE_TYPES } from '../../services/inviteService';
import { supabase } from '../../lib/supabaseClient';
import type { GPContactInsert, GPContactRow, GPContactUpdate } from '../../lib/supabaseTables';
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
  patient_id: string;
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

type GPContactListRow = Pick<
  GPContactRow,
  'id' | 'name' | 'phone' | 'address' | 'specialty' | 'email'
>;

function rowToGPContact(row: GPContactListRow): GPContact {
  return {
    id: row.id,
    gpName: row.name,
    phoneNumber: row.phone ?? undefined,
    practiceName: row.address ?? undefined,
    specialty: row.specialty ?? undefined,
    email: row.email ?? undefined,
  };
}

function payloadToRowFields(data: Omit<GPContact, 'id'>): Pick<
  GPContactInsert,
  'name' | 'phone' | 'address' | 'specialty' | 'email'
> {
  const name = data.gpName?.trim();
  if (!name) {
    throw new Error('GP name is required');
  }

  return {
    name,
    phone: data.phoneNumber?.trim() || null,
    address: data.practiceName?.trim() || null,
    specialty: data.specialty?.trim() || 'General Practice',
    email: data.email?.trim() || null,
  };
}

async function getPatientIdForGroup(groupId: string): Promise<string> {
  const { data, error } = await supabase
    .from('patients')
    .select('id')
    .eq('group_id', groupId)
    .maybeSingle();

  if (error) {
    console.error('Error resolving patient for group:', error);
    throw new Error('Failed to load patient for this care group');
  }

  if (!data?.id) {
    throw new Error('Patient not found for this care group');
  }

  return data.id;
}

async function fetchGPContactsForPatient(patientId: string): Promise<GPContact[]> {
  const { data, error } = await supabase
    .from('gp_contacts')
    .select('id, name, phone, address, specialty, email')
    .eq('patient_id', patientId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching GP contacts:', error);
    return [];
  }

  return (data ?? []).map(rowToGPContact);
}

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

/** Only primary carers (role_in_care = primary_carer) manage shift assignments. */
export function canAssignGroupShifts(role: GroupRole): boolean {
  return role === 'Admin';
}
export async function getGroups(): Promise<GroupSummary[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('care_givers')
    .select(`
      role_in_care,
      joined_at,
      patient_id,
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
      patientId: item.patient_id,
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

  const { data: patientRow } = await supabase
    .from('patients')
    .select('id')
    .eq('group_id', groupId)
    .maybeSingle();

  const userRole = mapRole(membership.role_in_care ?? '');
  const canSchedule = membership.can_schedule === true;

  const members: GroupMember[] = (groupData.care_givers ?? []).map(m => ({
    id: m.caregiver_id,
    name: m.profiles?.full_name || 'Unknown',
    email: m.profiles?.email ?? '',
    role: mapRole(m.role_in_care ?? ''),
    joinedAt: m.joined_at,
    status: m.status === 'active' ? 'Active' : 'Suspended',
  }));

  const gpContacts = patientRow?.id
    ? await fetchGPContactsForPatient(patientRow.id)
    : [];

  return {
    id: groupData.id,
    name: groupData.name ?? '',
    description: groupData.description ?? '',
    role: userRole,
    createdAt: groupData.created_at ?? new Date().toISOString(),
    canSchedule,
    members,
    gpContacts,
    patientId: patientRow?.id ?? '',
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

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001').replace(
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
  const patientId = await getPatientIdForGroup(groupId);
  const rowFields = payloadToRowFields(data);

  const { data: inserted, error } = await supabase
    .from('gp_contacts')
    .insert({
      patient_id: patientId,
      ...rowFields,
      is_active: true,
    } satisfies GPContactInsert)
    .select('id, name, phone, address, specialty, email')
    .single();

  if (error || !inserted) {
    console.error('addGPContact:', error);
    throw new Error(error?.message || 'Unable to add GP contact');
  }

  return rowToGPContact(inserted);
}

export async function updateGPContact(
  groupId: string,
  gpId: string,
  data: Omit<GPContact, 'id'>,
): Promise<GPContact> {
  const patientId = await getPatientIdForGroup(groupId);
  const rowFields = payloadToRowFields(data);

  const { data: updated, error } = await supabase
    .from('gp_contacts')
    .update(rowFields satisfies GPContactUpdate)
    .eq('id', gpId)
    .eq('patient_id', patientId)
    .eq('is_active', true)
    .select('id, name, phone, address, specialty, email')
    .maybeSingle();

  if (error) {
    console.error('updateGPContact:', error);
    throw new Error(error.message || 'Unable to update GP contact');
  }

  if (!updated) {
    throw new Error(
      'GP contact could not be updated. You may not have permission, or the contact was removed.',
    );
  }

  return rowToGPContact(updated);
}

export async function removeGPContact(groupId: string, gpId: string): Promise<void> {
  const patientId = await getPatientIdForGroup(groupId);

  const { data: removed, error } = await supabase
    .from('gp_contacts')
    .update({ is_active: false } satisfies GPContactUpdate)
    .eq('id', gpId)
    .eq('patient_id', patientId)
    .eq('is_active', true)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('removeGPContact:', error);
    throw new Error(error.message || 'Unable to remove GP contact');
  }

  if (!removed) {
    throw new Error('GP contact not found');
  }
}