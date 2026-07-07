import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { assertGroupMemberIfTokenPresent } from '../common/auth/group-membership.util';
import { ChecklistMaterializationService } from '../checklist/checklist-materialization.service';
import { ChecklistReconciliationService } from '../checklist/checklist-materialization.service';
import { CareGroupRepository } from '../integrations/repositories/care-group.repository';
import { MedicationRepository } from '../integrations/repositories/medication.repository';
import { SupabaseAdminClient } from '../integrations/supabase-admin.client';
import type { MedicationRecord } from '../integrations/types';
import type {
  CreateMedicationDto,
  UpdateMedicationDto,
} from './medications.dto';

const SCHEDULE_FIELDS = [
  'schedule_type',
  'specific_times',
  'interval_hours',
  'days_of_week',
  'day_of_month',
  'start_date',
  'end_date',
  'perpetual',
  'total_doses',
  'dose',
  'unit',
] as const;

function scheduleAffectingChange(
  oldMed: MedicationRecord,
  changes: Record<string, unknown>,
): boolean {
  const old = oldMed as unknown as Record<string, unknown>;
  return SCHEDULE_FIELDS.some(
    (field) => field in changes && changes[field] !== old[field],
  );
}

@Injectable()
export class MedicationsService {
  private readonly logger = new Logger(MedicationsService.name);

  constructor(
    private readonly medicationRepo: MedicationRepository,
    private readonly careGroupRepo: CareGroupRepository,
    private readonly supabase: SupabaseAdminClient,
    private readonly materialization: ChecklistMaterializationService,
    private readonly reconciliation: ChecklistReconciliationService,
  ) {}

  async create(
    groupId: string,
    dto: CreateMedicationDto,
    accessToken?: string,
  ) {
    await assertGroupMemberIfTokenPresent(this.supabase, groupId, accessToken);

    const groupCtx = await this.careGroupRepo.getGroupContext(groupId);
    if (!groupCtx) throw new NotFoundException('Group not found');

    const med = await this.medicationRepo.insert({
      patient_id: dto.patientId ?? groupCtx.patientId,
      medication_name: dto.medicationName,
      dose: dto.dose,
      unit: dto.unit,
      start_date: dto.startDate,
      schedule_type: dto.scheduleType,
      specific_times: dto.specificTimes ?? null,
      interval_hours: dto.intervalHours ?? null,
      days_of_week: dto.daysOfWeek ?? null,
      day_of_month: dto.dayOfMonth ?? null,
      perpetual: dto.perpetual ?? false,
      end_date: dto.endDate ?? null,
      total_doses: dto.totalDoses ?? null,
      status: 'active',
      form: dto.form ?? null,
      route: dto.route ?? null,
      instructions: dto.instructions ?? null,
      take_with_food: dto.takeWithFood ?? null,
      quantity_on_hand: dto.quantityOnHand ?? null,
    });

    if (med.schedule_type !== 'as_needed') {
      try {
        await this.materialization.materializeForMedication(
          med.id,
          'medication_create',
        );
      } catch (err) {
        this.logger.error(`materialize_failed medicationId=${med.id}`, err);
        throw new InternalServerErrorException(
          err instanceof Error
            ? `Medication saved but checklist materialization failed: ${err.message}`
            : 'Medication saved but checklist materialization failed',
        );
      }
    }

    return med;
  }

  async update(
    groupId: string,
    medicationId: string,
    dto: UpdateMedicationDto,
    accessToken?: string,
  ) {
    await assertGroupMemberIfTokenPresent(this.supabase, groupId, accessToken);
    const oldMed = await this.medicationRepo.findById(medicationId);
    if (!oldMed) throw new NotFoundException('Medication not found');

    const changes: Record<string, unknown> = {};
    if (dto.medicationName !== undefined)
      changes.medication_name = dto.medicationName;
    if (dto.dose !== undefined) changes.dose = dto.dose;
    if (dto.unit !== undefined) changes.unit = dto.unit;
    if (dto.startDate !== undefined) changes.start_date = dto.startDate;
    if (dto.scheduleType !== undefined)
      changes.schedule_type = dto.scheduleType;
    if (dto.specificTimes !== undefined)
      changes.specific_times = dto.specificTimes;
    if (dto.intervalHours !== undefined)
      changes.interval_hours = dto.intervalHours;
    if (dto.daysOfWeek !== undefined) changes.days_of_week = dto.daysOfWeek;
    if (dto.dayOfMonth !== undefined) changes.day_of_month = dto.dayOfMonth;
    if (dto.perpetual !== undefined) changes.perpetual = dto.perpetual;
    if (dto.endDate !== undefined) changes.end_date = dto.endDate;
    if (dto.totalDoses !== undefined) changes.total_doses = dto.totalDoses;
    if (dto.quantityOnHand !== undefined)
      changes.quantity_on_hand = dto.quantityOnHand;

    const newMed = await this.medicationRepo.update(medicationId, changes);

    if (scheduleAffectingChange(oldMed, changes)) {
      await this.reconciliation.reconcileAfterMedicationEdit(oldMed, newMed);
    }

    return newMed;
  }

  async pause(groupId: string, medicationId: string, accessToken?: string) {
    await assertGroupMemberIfTokenPresent(this.supabase, groupId, accessToken);
    await this.reconciliation.pauseMedication(medicationId);
    return this.medicationRepo.findById(medicationId);
  }

  async activate(groupId: string, medicationId: string, accessToken?: string) {
    await assertGroupMemberIfTokenPresent(this.supabase, groupId, accessToken);
    await this.reconciliation.activateMedication(medicationId);
    return this.medicationRepo.findById(medicationId);
  }

  async archive(groupId: string, medicationId: string, accessToken?: string) {
    await assertGroupMemberIfTokenPresent(this.supabase, groupId, accessToken);
    await this.reconciliation.archiveMedication(medicationId);
    return this.medicationRepo.findById(medicationId);
  }
}
