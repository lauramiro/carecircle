import axios from 'axios';
import { INVITE_TYPES } from '../../services/inviteService';
import { supabase } from '../../lib/supabaseClient';
import type {
  EmergencyContactInsert,
  EmergencyContactRow,
  EmergencyContactUpdate,
  GPContactInsert,
  GPContactRow,
  GPContactUpdate,
} from '../../lib/supabaseTables';
import type {
  EmergencyContact,
  EmergencyContactFormData,
  GroupMember,
  GPContact,
  Group,
  GroupSummary,
  InvitePayload,
  InviteResult,
} from './groups.types';
import { parseCareRole } from '../../lib/careRole';
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

type FreeFormEmergencyContactRow = Pick<
  EmergencyContactRow,
  'id' | 'label' | 'contact_name' | 'phone'
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

function emergencyPayloadToRowFields(
  data: EmergencyContactFormData,
): Pick<EmergencyContactInsert, 'contact_name' | 'label' | 'phone'> {
  const contactName = data.name.trim();
  const label = data.role.trim();
  const phone = data.phoneNumber.trim();

  if (!contactName) throw new Error('Contact name is required');
  if (!label) throw new Error('Contact role is required');
  if (!phone) throw new Error('Phone number is required');

  return { contact_name: contactName, label, phone };
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

async function getPatientEmergencyContext(groupId: string): Promise<{
  patientId: string;
  primaryCaregiverId: string | null;
}> {
  const { data, error } = await supabase
    .from('patients')
    .select('id, primary_caregiver_id')
    .eq('group_id', groupId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error('Patient not found for this care group');

  return {
    patientId: data.id,
    primaryCaregiverId: data.primary_caregiver_id ?? null,
  };
}

function gpContactToEmergencyContact(contact: GPContact): EmergencyContact | null {
  if (!contact.phoneNumber) return null;
  return {
    id: `gp:${contact.id}`,
    name: contact.gpName || 'GP',
    role: contact.specialty || 'GP',
    phoneNumber: contact.phoneNumber,
    source: 'gp',
    editable: false,
  };
}

function freeFormRowToEmergencyContact(row: FreeFormEmergencyContactRow): EmergencyContact {
  return {
    id: row.id,
    name: row.contact_name,
    role: row.label,
    phoneNumber: row.phone,
    source: 'free_form',
    editable: true,
  };
}

function postgrestErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return null;
  }
  const code = error.code;
  return typeof code === 'string' ? code : null;
}

function isMissingOptionalEmergencySchema(error: unknown): boolean {
  return ['42703', '42P01'].includes(postgrestErrorCode(error) ?? '');
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
      role: parseCareRole(item.role_in_care),
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

  const userRole = parseCareRole(membership.role_in_care);
  const canSchedule = membership.can_schedule === true;

  const members: GroupMember[] = (groupData.care_givers ?? []).map(m => ({
    id: m.caregiver_id,
    name: m.profiles?.full_name || 'Unknown',
    email: m.profiles?.email ?? '',
    role: parseCareRole(m.role_in_care),
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

export async function updateMemberRole(
  groupId: string,
  caregiverId: string,
  newRole: ROLE,
): Promise<void> {
  const { error } = await supabase.rpc('update_care_giver_role', {
    p_group_id: groupId,
    p_caregiver_id: caregiverId,
    p_new_role: newRole,
  });

  if (error) {
    console.error('updateMemberRole:', error);
    throw new Error(error.message || 'Unable to update member role');
  }
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

export async function getEmergencyContacts(groupId: string): Promise<EmergencyContact[]> {
  const { patientId, primaryCaregiverId } = await getPatientEmergencyContext(groupId);
  const contacts: EmergencyContact[] = [];

  const gpContacts = await fetchGPContactsForPatient(patientId);
  contacts.push(
    ...gpContacts
      .map(gpContactToEmergencyContact)
      .filter((contact): contact is EmergencyContact => contact !== null),
  );

  const { data: specialistRows, error: specialistError } = await supabase
    .from('appointments')
    .select('id, provider_name, provider_phone')
    .eq('patient_id', patientId)
    .neq('status', 'cancelled')
    .not('provider_phone', 'is', null)
    .order('start_time', { ascending: false });

  if (specialistError) {
    if (isMissingOptionalEmergencySchema(specialistError)) {
      console.warn('Specialist emergency contacts unavailable:', specialistError.message);
    } else {
      throw new Error(specialistError.message);
    }
  } else {
    const seenSpecialists = new Set<string>();
    for (const row of specialistRows ?? []) {
      const name = row.provider_name?.trim();
      const phone = row.provider_phone?.trim();
      if (!name || !phone) continue;
      const key = `${name}:${phone}`;
      if (seenSpecialists.has(key)) continue;
      seenSpecialists.add(key);
      contacts.push({
        id: `specialist:${row.id}`,
        name,
        role: 'Specialist',
        phoneNumber: phone,
        source: 'specialist',
        editable: false,
      });
    }
  }

  if (primaryCaregiverId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', primaryCaregiverId)
      .maybeSingle();

    if (profile?.phone) {
      contacts.push({
        id: `primary-carer:${primaryCaregiverId}`,
        name: profile.full_name || 'Primary carer',
        role: 'Primary carer',
        phoneNumber: profile.phone,
        source: 'primary_carer',
        editable: false,
      });
    }
  }

  const { data: freeFormRows, error: freeFormError } = await supabase
    .from('emergency_contacts')
    .select('id, label, contact_name, phone')
    .eq('patient_id', patientId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (freeFormError) {
    if (isMissingOptionalEmergencySchema(freeFormError)) {
      console.warn('Free-form emergency contacts unavailable:', freeFormError.message);
    } else {
      throw new Error(freeFormError.message);
    }
  } else {
    contacts.push(...(freeFormRows ?? []).map(freeFormRowToEmergencyContact));
  }

  return contacts;
}

export async function addEmergencyContact(
  groupId: string,
  data: EmergencyContactFormData,
): Promise<EmergencyContact> {
  const patientId = await getPatientIdForGroup(groupId);
  const { data: existing } = await supabase
    .from('emergency_contacts')
    .select('id')
    .eq('patient_id', patientId)
    .eq('is_active', true);

  if ((existing?.length ?? 0) >= 2) {
    throw new Error('Only two emergency contacts can be added');
  }

  const { data: inserted, error } = await supabase
    .from('emergency_contacts')
    .insert({
      patient_id: patientId,
      ...emergencyPayloadToRowFields(data),
      sort_order: existing?.length ?? 0,
      is_active: true,
    } satisfies EmergencyContactInsert)
    .select('id, label, contact_name, phone')
    .single();

  if (error || !inserted) {
    throw new Error(error?.message || 'Unable to add emergency contact');
  }

  return freeFormRowToEmergencyContact(inserted);
}

export async function updateEmergencyContact(
  groupId: string,
  contactId: string,
  data: EmergencyContactFormData,
): Promise<EmergencyContact> {
  const patientId = await getPatientIdForGroup(groupId);
  const { data: updated, error } = await supabase
    .from('emergency_contacts')
    .update(emergencyPayloadToRowFields(data) satisfies EmergencyContactUpdate)
    .eq('id', contactId)
    .eq('patient_id', patientId)
    .eq('is_active', true)
    .select('id, label, contact_name, phone')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!updated) throw new Error('Emergency contact not found');

  return freeFormRowToEmergencyContact(updated);
}

export async function removeEmergencyContact(
  groupId: string,
  contactId: string,
): Promise<void> {
  const patientId = await getPatientIdForGroup(groupId);
  const { data: removed, error } = await supabase
    .from('emergency_contacts')
    .update({ is_active: false } satisfies EmergencyContactUpdate)
    .eq('id', contactId)
    .eq('patient_id', patientId)
    .eq('is_active', true)
    .select('id')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!removed) throw new Error('Emergency contact not found');
}