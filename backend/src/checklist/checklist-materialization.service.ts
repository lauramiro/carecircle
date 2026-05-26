import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { AlertRepository } from '../integrations/repositories/alert.repository';
import { ChecklistRepository } from '../integrations/repositories/checklist.repository';
import { MedicationRepository } from '../integrations/repositories/medication.repository';
import { CareGroupRepository } from '../integrations/repositories/care-group.repository';
import type { ChecklistItemInsert, MedicationRecord } from '../integrations/types';
import {
  enumerateFutureDoseSlots,
  medicationRecordToSlotMed,
  needsHorizonExtension,
} from './slot-computation';

@Injectable()
export class ChecklistMaterializationService {
  private readonly logger = new Logger(ChecklistMaterializationService.name);

  constructor(
    private readonly medicationRepo: MedicationRepository,
    private readonly checklistRepo: ChecklistRepository,
    private readonly careGroupRepo: CareGroupRepository,
    private readonly appConfig: AppConfigService,
  ) {}

  async materializeForMedication(medicationId: string, reason: string): Promise<void> {
    const med = await this.medicationRepo.findById(medicationId);
    if (!med || med.status !== 'active' || med.schedule_type === 'as_needed') return;

    const groupCtx = await this.careGroupRepo.getGroupContextByPatientId(med.patient_id);
    if (!groupCtx?.patientId) {
      this.logger.warn(`materialize_skip no_group medicationId=${medicationId} reason=${reason}`);
      return;
    }

    const batchSize = this.appConfig.materializationBatchSize;
    const slotMed = medicationRecordToSlotMed(med);
    const cursorAt = med.materialization_cursor_at
      ? new Date(med.materialization_cursor_at)
      : null;
    const now = new Date();
    const allSlots = enumerateFutureDoseSlots(slotMed, groupCtx.preferredTimezone, now, cursorAt);
    const batch = allSlots.slice(0, batchSize);

    if (batch.length === 0) {
      await this.checklistRepo.upsertSchedule({
        medicationId,
        nextComputeAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        cursorAt: med.materialization_cursor_at,
        status: 'done',
      });
      return;
    }

    const inserts: ChecklistItemInsert[] = [];
    for (const slot of batch) {
      const checklistId = await this.checklistRepo.ensureDailyChecklist({
        patientId: groupCtx.patientId,
        groupId: groupCtx.groupId,
        checklistDate: slot.localDate,
      });

      inserts.push({
        checklist_id: checklistId,
        medication_id: med.id,
        medication_name: med.medication_name,
        dose: med.dose,
        dosage_unit: med.unit,
        scheduled_time: slot.scheduledTime,
        time_of_day: slot.scheduledTime,
        window_start: slot.windowStart,
        window_end: slot.windowEnd,
        scheduled_at: slot.scheduledAt.toISOString(),
        status: 'due',
        group_id: groupCtx.groupId,
        patient_id: groupCtx.patientId,
        timezone: groupCtx.preferredTimezone,
      });
    }

    await this.checklistRepo.insertChecklistItems(inserts);

    const lastScheduledAt = batch[batch.length - 1]!.scheduledAt.toISOString();
    await this.medicationRepo.updateMaterializationCursor(medicationId, lastScheduledAt);

    const remaining = allSlots.length - batch.length;
    if (remaining > 0) {
      await this.checklistRepo.upsertSchedule({
        medicationId,
        nextComputeAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        cursorAt: lastScheduledAt,
        status: 'pending',
      });
    } else {
      await this.checklistRepo.upsertSchedule({
        medicationId,
        nextComputeAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        cursorAt: lastScheduledAt,
        status: 'done',
      });
    }

    const futureDue = await this.checklistRepo.countFutureDueItems(medicationId);
    if (needsHorizonExtension(slotMed, futureDue, groupCtx.preferredTimezone)) {
      await this.checklistRepo.upsertSchedule({
        medicationId,
        nextComputeAt: new Date().toISOString(),
        cursorAt: lastScheduledAt,
        status: 'pending',
      });
    }

    this.logger.log(
      `materialized medicationId=${medicationId} inserted=${inserts.length} remaining=${remaining} reason=${reason}`,
    );
  }

  async extendPendingSchedules(limit: number): Promise<void> {
    const schedules = await this.checklistRepo.findPendingSchedulesDue(24, limit);
    for (const schedule of schedules) {
      try {
        await this.materializeForMedication(schedule.medication_id, 'cron_schedule');
      } catch (err) {
        this.logger.warn(`schedule_extend_failed medicationId=${schedule.medication_id}`, err);
        await this.checklistRepo.upsertSchedule({
          medicationId: schedule.medication_id,
          nextComputeAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          cursorAt: schedule.cursor_at,
          status: 'failed',
          lastError: err instanceof Error ? err.message : 'unknown',
        });
      }
    }
  }
}

@Injectable()
export class ChecklistReconciliationService {
  private readonly logger = new Logger(ChecklistReconciliationService.name);

  constructor(
    private readonly medicationRepo: MedicationRepository,
    private readonly checklistRepo: ChecklistRepository,
    private readonly alertRepo: AlertRepository,
    private readonly materialization: ChecklistMaterializationService,
  ) {}

  async reconcileAfterMedicationEdit(
    oldMed: MedicationRecord,
    newMed: MedicationRecord,
  ): Promise<void> {
    await this.checklistRepo.archiveFutureDueItems(newMed.id);
    await this.alertRepo.cancelOpenAlertsForMedication(newMed.id, 'schedule_changed');
    await this.medicationRepo.resetMaterializationCursor(newMed.id);
    await this.materialization.materializeForMedication(newMed.id, 'medication_edit');
    this.logger.log(`reconciled medicationId=${newMed.id} from=${oldMed.id}`);
  }

  async archiveMedication(medicationId: string): Promise<void> {
    await this.checklistRepo.archiveFutureDueItems(medicationId);
    await this.checklistRepo.archiveSchedulesForMedication(medicationId);
    await this.alertRepo.cancelOpenAlertsForMedication(medicationId, 'medication_archived');
    await this.medicationRepo.updateStatus(medicationId, 'archived');
  }

  async pauseMedication(medicationId: string): Promise<void> {
    await this.checklistRepo.archiveFutureDueItems(medicationId);
    await this.checklistRepo.archiveSchedulesForMedication(medicationId);
    await this.alertRepo.cancelOpenAlertsForMedication(medicationId, 'medication_paused');
    await this.medicationRepo.updateStatus(medicationId, 'paused');
  }

  async activateMedication(medicationId: string): Promise<void> {
    await this.medicationRepo.updateStatus(medicationId, 'active');
    await this.medicationRepo.resetMaterializationCursor(medicationId);
    await this.materialization.materializeForMedication(medicationId, 'medication_activate');
  }
}
