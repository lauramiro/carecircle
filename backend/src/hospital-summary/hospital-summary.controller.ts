import {
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  assertGroupMemberIfTokenPresent,
  extractBearerToken,
} from '../common/auth/group-membership.util';
import { GroupIdBodyDto } from '../common/dto/group-id.dto';
import { PatientRepository } from '../integrations/repositories/patient.repository';
import { SupabaseAdminClient } from '../integrations/supabase-admin.client';
import {
  HospitalSummaryService,
  HospitalSummaryData,
} from './hospital-summary.service';
import { PDFGenerationService } from './pdf-generation.service';

@Controller('hospital-summary')
export class HospitalSummaryController {
  private readonly logger = new Logger(HospitalSummaryController.name);

  constructor(
    private readonly supabase: SupabaseAdminClient,
    private readonly patientRepo: PatientRepository,
    private readonly hospitalSummaryService: HospitalSummaryService,
    private readonly pdfGenerationService: PDFGenerationService,
  ) {}

  private async resolvePatientId(groupId: string): Promise<string> {
    const patientId = await this.patientRepo.findIdByGroupId(groupId);
    if (!patientId) {
      throw new HttpException(
        'Group not found or patient id not resolved',
        HttpStatus.NOT_FOUND,
      );
    }
    return patientId;
  }

  @Post('generate-pdf')
  async generateHospitalSummaryPDF(
    @Body() dto: GroupIdBodyDto,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Res() res: Response,
  ) {
    const startTime = Date.now();
    const accessToken = extractBearerToken(authorizationHeader);

    try {
      await assertGroupMemberIfTokenPresent(
        this.supabase,
        dto.groupId,
        accessToken,
      );

      const patientId = await this.resolvePatientId(dto.groupId);
      this.logger.log(
        `Generating hospital summary PDF for group: ${dto.groupId}, patient: ${patientId}`,
      );

      const summaryData =
        await this.hospitalSummaryService.assembleHospitalSummary(patientId);

      if (!summaryData.isValid) {
        this.logger.warn(
          `Hospital summary for group ${dto.groupId} has validation errors:`,
          summaryData.validationErrors,
        );

        if (summaryData.validationErrors.length > 0) {
          res.set(
            'X-Validation-Errors',
            JSON.stringify(summaryData.validationErrors),
          );
        }
      }

      const pdfBuffer =
        await this.pdfGenerationService.generateHospitalSummaryPDF(summaryData);

      const latencyMs = Date.now() - startTime;

      this.logger.log(
        `Hospital summary PDF generated in ${latencyMs}ms for group: ${dto.groupId}`,
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="hospital-summary-${summaryData.fullName}-${
          new Date().toISOString().split('T')[0]
        }.pdf"`,
      );
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('X-Generation-Latency-Ms', latencyMs.toString());

      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to generate hospital summary PDF:`, error);

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error instanceof Error
              ? error.message
              : 'Failed to generate hospital summary PDF',
          error: 'GENERATION_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('assemble')
  async assembleSummaryData(
    @Body() dto: GroupIdBodyDto,
    @Headers('authorization') authorizationHeader: string | undefined,
  ): Promise<HospitalSummaryData> {
    try {
      await assertGroupMemberIfTokenPresent(
        this.supabase,
        dto.groupId,
        extractBearerToken(authorizationHeader),
      );

      const patientId = await this.resolvePatientId(dto.groupId);
      this.logger.log(
        `Assembling hospital summary for group: ${dto.groupId}, patient: ${patientId}`,
      );

      const summaryData =
        await this.hospitalSummaryService.assembleHospitalSummary(patientId);

      if (!summaryData.isValid) {
        this.logger.warn(
          `Hospital summary for group ${dto.groupId} has validation errors`,
          summaryData.validationErrors,
        );
      }

      return summaryData;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to assemble hospital summary:`, error);

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error instanceof Error
              ? error.message
              : 'Failed to assemble hospital summary',
          error: 'ASSEMBLY_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
