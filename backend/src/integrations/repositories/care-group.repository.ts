import { Injectable } from '@nestjs/common';
import { isE164Phone } from '../../common/validation/e164';
import { SupabaseAdminClient } from '../supabase-admin.client';
import type { ActiveGroupMembers, GroupContext } from '../types';

@Injectable()
export class CareGroupRepository {
  constructor(private readonly supabase: SupabaseAdminClient) {}

  async getGroupContext(groupId: string): Promise<GroupContext | null> {
    const client = this.supabase.getClient();

    const { data: group, error } = await client
      .from('care_group')
      .select('id, preferred_timezone')
      .eq('id', groupId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!group) return null;

    const { data: patient, error: patientError } = await client
      .from('patients')
      .select('id, full_name')
      .eq('group_id', groupId)
      .maybeSingle();

    if (patientError) throw new Error(patientError.message);

    const fullName = patient?.full_name?.trim() ?? '';
    const patientFirstName = fullName ? (fullName.split(/\s+/)[0] ?? 'Patient') : 'Patient';

    return {
      groupId: group.id,
      patientId: patient?.id ?? '',
      preferredTimezone: group.preferred_timezone ?? 'UTC',
      patientFirstName,
    };
  }

  async getGroupContextByPatientId(patientId: string): Promise<GroupContext | null> {
    const client = this.supabase.getClient();

    const { data: patient, error } = await client
      .from('patients')
      .select('id, full_name, group_id')
      .eq('id', patientId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!patient?.group_id) return null;

    const { data: group, error: groupError } = await client
      .from('care_group')
      .select('id, preferred_timezone')
      .eq('id', patient.group_id)
      .maybeSingle();

    if (groupError) throw new Error(groupError.message);

    const fullName = patient.full_name?.trim() ?? '';
    const patientFirstName = fullName ? (fullName.split(/\s+/)[0] ?? 'Patient') : 'Patient';

    return {
      groupId: patient.group_id,
      patientId: patient.id,
      preferredTimezone: group?.preferred_timezone ?? 'UTC',
      patientFirstName,
    };
  }

  async listActiveGroupMembers(groupId: string): Promise<ActiveGroupMembers> {
    const { data, error } = await this.supabase
      .getClient()
      .from('care_givers')
      .select('caregiver_id, profiles(phone)')
      .eq('group_id', groupId)
      .eq('status', 'active');

    if (error) throw new Error(error.message);

    const groupMembersIds: string[] = [];
    const groupMembersPhoneNumbers: string[] = [];

    for (const row of data ?? []) {
      const r = row as { caregiver_id: string; profiles?: { phone?: string | null } | null };
      groupMembersIds.push(r.caregiver_id);
      const raw = r.profiles?.phone?.trim();
      if (raw && isE164Phone(raw)) groupMembersPhoneNumbers.push(raw);
    }

    return {
      groupMembersIds: [...new Set(groupMembersIds)],
      groupMembersPhoneNumbers: [...new Set(groupMembersPhoneNumbers)],
    };
  }
}
