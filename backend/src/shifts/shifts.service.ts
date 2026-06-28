import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseAdminClient } from '../integrations/supabase-admin.client';
import { AssignShiftDto } from './shifts.controller';

@Injectable()
export class ShiftsService {
  private readonly logger = new Logger(ShiftsService.name);

  constructor(private readonly supabase: SupabaseAdminClient) { }

  async assignShift(dto: AssignShiftDto) {
    const db = this.supabase.getClient();

    if (dto.assignedCaregiverId) {
      // 1. Check if the slot in this group is already filled by someone else
      const { data: existingSlot } = await db
        .from('weekly_shift_assignments')
        .select('assigned_caregiver_id')
        .eq('group_id', dto.groupId)
        .eq('shift_date', dto.shiftDate)
        .eq('shift_slot', dto.slot)
        .maybeSingle();

      if (
        existingSlot &&
        existingSlot.assigned_caregiver_id &&
        existingSlot.assigned_caregiver_id !== dto.assignedCaregiverId
      ) {
        throw new HttpException(
          'This slot is already filled by someone else.',
          HttpStatus.CONFLICT,
        );
      }

      // 2. Check if the carer already holds this slot (in any group)
      const { data: existingCarerSlot } = await db
        .from('weekly_shift_assignments')
        .select('id, group_id')
        .eq('assigned_caregiver_id', dto.assignedCaregiverId)
        .eq('shift_date', dto.shiftDate)
        .eq('shift_slot', dto.slot)
        .maybeSingle();

      if (existingCarerSlot && existingCarerSlot.group_id !== dto.groupId) {
        throw new HttpException(
          'This carer is already assigned to this slot in another group.',
          HttpStatus.CONFLICT,
        );
      }
    }

    // If validations pass (or if unassigning), perform the upsert
    const { data, error } = await db
      .from('weekly_shift_assignments')
      .upsert(
        {
          group_id: dto.groupId,
          shift_date: dto.shiftDate,
          shift_slot: dto.slot,
          assigned_caregiver_id: dto.assignedCaregiverId,
          last_changed_by: dto.changedBy,
        },
        { onConflict: 'group_id,shift_date,shift_slot' }
      )
      .select(`
        id,
        group_id,
        shift_date,
        shift_slot,
        assigned_caregiver_id,
        updated_at,
        assignee:profiles!weekly_shift_assignments_assigned_caregiver_id_fkey (
          full_name
        )
      `)
      .single();

    if (error || !data) {
      this.logger.error(
        `assignShift upsert failed for group=${dto.groupId} date=${dto.shiftDate} slot=${dto.slot}: ${JSON.stringify(error)}`,
      );
      throw new HttpException('Failed to save shift assignment', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return data;
  }
}
