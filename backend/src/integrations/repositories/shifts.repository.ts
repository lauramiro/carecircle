/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { SupabaseAdminClient } from '../supabase-admin.client';
import { AssignShiftDto } from '../../shifts/dto/assign-shift.dto';

@Injectable()
export class ShiftsRepository {
  constructor(private readonly supabase: SupabaseAdminClient) {}

  async isMember(groupId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .getClient()
      .from('care_givers')
      .select('caregiver_id')
      .eq('group_id', groupId)
      .eq('caregiver_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data !== null;
  }

  async getSlotOccupant(
    groupId: string,
    shiftDate: string,
    slot: string,
  ): Promise<string | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('weekly_shift_assignments')
      .select('assigned_caregiver_id')
      .eq('group_id', groupId)
      .eq('shift_date', shiftDate)
      .eq('shift_slot', slot)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.assigned_caregiver_id ?? null;
  }

  async getCarerSlotInOtherGroup(
    caregiverId: string,
    shiftDate: string,
    slot: string,
    excludeGroupId: string,
  ): Promise<string | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('weekly_shift_assignments')
      .select('group_id')
      .eq('assigned_caregiver_id', caregiverId)
      .eq('shift_date', shiftDate)
      .eq('shift_slot', slot)
      .neq('group_id', excludeGroupId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.group_id ?? null;
  }

  async upsertAssignment(dto: AssignShiftDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from('weekly_shift_assignments')
      .upsert(
        {
          group_id: dto.groupId,
          shift_date: dto.shiftDate,
          shift_slot: dto.slot,
          assigned_caregiver_id: dto.assignedCaregiverId,
          last_changed_by: dto.changedBy,
        },
        { onConflict: 'group_id,shift_date,shift_slot' },
      )
      .select(
        `
        id,
        group_id,
        shift_date,
        shift_slot,
        assigned_caregiver_id,
        updated_at,
        assignee:profiles!weekly_shift_assignments_assigned_caregiver_id_fkey (
          full_name
        )
      `,
      )
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}
