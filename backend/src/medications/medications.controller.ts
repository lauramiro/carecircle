import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateMedicationDto, UpdateMedicationDto } from './medications.dto';
import { MedicationsService } from './medications.service';

@Controller('groups/:groupId/medications')
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  /**
   * Creates a medication schedule for the patient attached to `groupId`.
   *
   * The controller enforces the cross-field course-duration rule before calling
   * the service: recurring medications must have a clear stopping strategy
   * (perpetual, end date, or total doses), while as-needed medications are
   * allowed to remain open-ended.
   *
   * @param groupId Care group route parameter used to resolve the patient and
   * enforce group ownership in the service layer.
   * @param dto Medication creation payload including name, dose, unit,
   * frequency, schedule type, and course bounds.
   * @returns The medication/schedule record created by `MedicationsService`.
   * @throws BadRequestException when a non-as-needed medication omits
   * `perpetual`, `endDate`, and `totalDoses`.
   */
  @Post()
  create(@Param('groupId') groupId: string, @Body() dto: CreateMedicationDto) {
    this.validateCourseBounds(
      dto.scheduleType,
      dto.perpetual,
      dto.endDate,
      dto.totalDoses,
    );
    return this.medicationsService.create(groupId, dto);
  }

  /**
   * Updates medication details and scheduling fields for a group-owned medicine.
   *
   * Group scoping is kept in the route because the service uses it to resolve
   * ownership and avoid applying edits to similarly shaped medication IDs from
   * another care circle.
   *
   * @param groupId Care group route parameter used as the ownership boundary.
   * @param medicationId Medication route parameter identifying the schedule to edit.
   * @param dto Partial medication update payload.
   * @returns The updated medication/schedule record from `MedicationsService`.
   * @throws Error Propagates service validation, ownership, or persistence
   * errors when the medication cannot be updated.
   */
  @Patch(':medicationId')
  update(
    @Param('groupId') groupId: string,
    @Param('medicationId') medicationId: string,
    @Body() dto: UpdateMedicationDto,
  ) {
    return this.medicationsService.update(groupId, medicationId, dto);
  }

  /**
   * Temporarily pauses a medication without deleting historical schedule data.
   *
   * Pausing is used when the care team expects the medication may resume later;
   * checklist materialization and active schedule views should treat paused
   * records differently from archived ones.
   *
   * @param medicationId Medication route parameter identifying the schedule to pause.
   * @returns The paused medication/schedule state from `MedicationsService`.
   * @throws Error Propagates service errors when the medication does not exist
   * or cannot transition to paused.
   */
  @Post(':medicationId/pause')
  pause(@Param('medicationId') medicationId: string) {
    return this.medicationsService.pause(medicationId);
  }

  /**
   * Reactivates a paused medication so future checklist items can be produced.
   *
   * The service owns any downstream schedule/materialization side effects,
   * keeping this handler a narrow state-transition boundary.
   *
   * @param medicationId Medication route parameter identifying the schedule to activate.
   * @returns The active medication/schedule state from `MedicationsService`.
   * @throws Error Propagates service errors when the medication does not exist
   * or cannot transition to active.
   */
  @Post(':medicationId/activate')
  activate(@Param('medicationId') medicationId: string) {
    return this.medicationsService.activate(medicationId);
  }

  /**
   * Archives a medication when it should disappear from active workflows.
   *
   * Archive is intentionally modeled as a state transition rather than a hard
   * delete so audit, adherence, and historical checklist records remain intact.
   *
   * @param medicationId Medication route parameter identifying the schedule to archive.
   * @returns The archived medication/schedule state from `MedicationsService`.
   * @throws Error Propagates service errors when the medication does not exist
   * or cannot transition to archived.
   */
  @Post(':medicationId/archive')
  archive(@Param('medicationId') medicationId: string) {
    return this.medicationsService.archive(medicationId);
  }

  private validateCourseBounds(
    scheduleType: string,
    perpetual: boolean,
    endDate?: string,
    totalDoses?: number,
  ): void {
    if (scheduleType === 'as_needed') return;
    if (perpetual || endDate || totalDoses) return;
    throw new BadRequestException(
      'Non as-needed medications require perpetual, end_date, or total_doses',
    );
  }
}
