import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { extractBearerToken } from '../common/auth/group-membership.util';
import { SupabaseAdminClient } from '../integrations/supabase-admin.client';
import { CreateMedicationDto, UpdateMedicationDto } from './medications.dto';
import { MedicationsService } from './medications.service';

@Controller('groups/:groupId/medications')
export class MedicationsController {
  constructor(
    private readonly medicationsService: MedicationsService,
    private readonly supabase: SupabaseAdminClient,
  ) {}

  @Post()
  create(
    @Param('groupId') groupId: string,
    @Body() dto: CreateMedicationDto,
    @Headers('authorization') authorizationHeader?: string,
  ) {
    this.validateCourseBounds(
      dto.scheduleType,
      dto.perpetual,
      dto.endDate,
      dto.totalDoses,
    );
    return this.medicationsService.create(
      groupId,
      dto,
      extractBearerToken(authorizationHeader),
    );
  }

  @Patch(':medicationId')
  update(
    @Param('groupId') groupId: string,
    @Param('medicationId') medicationId: string,
    @Body() dto: UpdateMedicationDto,
    @Headers('authorization') authorizationHeader?: string,
  ) {
    return this.medicationsService.update(
      groupId,
      medicationId,
      dto,
      extractBearerToken(authorizationHeader),
    );
  }

  @Post(':medicationId/pause')
  pause(
    @Param('groupId') groupId: string,
    @Param('medicationId') medicationId: string,
    @Headers('authorization') authorizationHeader?: string,
  ) {
    return this.medicationsService.pause(
      groupId,
      medicationId,
      extractBearerToken(authorizationHeader),
    );
  }

  @Post(':medicationId/activate')
  activate(
    @Param('groupId') groupId: string,
    @Param('medicationId') medicationId: string,
    @Headers('authorization') authorizationHeader?: string,
  ) {
    return this.medicationsService.activate(
      groupId,
      medicationId,
      extractBearerToken(authorizationHeader),
    );
  }

  @Post(':medicationId/archive')
  archive(
    @Param('groupId') groupId: string,
    @Param('medicationId') medicationId: string,
    @Headers('authorization') authorizationHeader?: string,
  ) {
    return this.medicationsService.archive(
      groupId,
      medicationId,
      extractBearerToken(authorizationHeader),
    );
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
