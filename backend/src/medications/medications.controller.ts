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

  @Patch(':medicationId')
  update(
    @Param('groupId') groupId: string,
    @Param('medicationId') medicationId: string,
    @Body() dto: UpdateMedicationDto,
  ) {
    return this.medicationsService.update(groupId, medicationId, dto);
  }

  @Post(':medicationId/pause')
  pause(@Param('medicationId') medicationId: string) {
    return this.medicationsService.pause(medicationId);
  }

  @Post(':medicationId/activate')
  activate(@Param('medicationId') medicationId: string) {
    return this.medicationsService.activate(medicationId);
  }

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
