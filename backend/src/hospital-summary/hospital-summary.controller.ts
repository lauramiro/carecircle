// Hospital Summary API Controller
// Endpoints for PDF generation and hospital summary assembly

import {
  Controller,
  Post,
  Body,
  Res,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
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
    private readonly hospitalSummaryService: HospitalSummaryService,
    private readonly pdfGenerationService: PDFGenerationService,
  ) {}

  private async resolvePatientId(groupId: string): Promise<string> {
    const { data, error } = await this.supabase
      .getClient()
      .from('patients')
      .select('id')
      .eq('group_id', groupId)
      .single();

    if (error || !data?.id) {
      throw new HttpException(
        'Group not found or patient id not resolved',
        HttpStatus.NOT_FOUND,
      );
    }

    return data.id as string;
  }

  /**
   * Single endpoint: Generate complete PDF from the group-owned patient profile
   * POST /api/hospital-summary/generate-pdf
   *
   * Request body: { groupId: string }
   * Response: PDF file (application/pdf)
   *
   * This endpoint:
   * 1. Fetches fresh patient profile from Supabase
   * 2. Assembles all sections (medications, conditions, allergies, etc.)
   * 3. Generates professional PDF with watermark and disclaimer
   * 4. Returns PDF as downloadable file
   */
  @Post('generate-pdf')
  async generateHospitalSummaryPDF(
    @Body() dto: { groupId: string },
    @Res() res: Response,
  ) {
    const startTime = Date.now();

    try {
      const patientId = await this.resolvePatientId(dto.groupId);
      this.logger.log(
        `Generating hospital summary PDF for group: ${dto.groupId}, patient: ${patientId}`,
      );

      // Step 1: Assemble complete care profile (CC-134)
      const summaryData =
        await this.hospitalSummaryService.assembleHospitalSummary(patientId);

      // Validate assembly was successful
      if (!summaryData.isValid) {
        this.logger.warn(
          `Hospital summary for group ${dto.groupId} has validation errors:`,
          summaryData.validationErrors,
        );

        // Still proceed with PDF generation, but include errors in response
        if (summaryData.validationErrors.length > 0) {
          res.set(
            'X-Validation-Errors',
            JSON.stringify(summaryData.validationErrors),
          );
        }
      }

      // Step 2: Generate PDF from assembled data (CC-135)
      const pdfBuffer =
        await this.pdfGenerationService.generateHospitalSummaryPDF(summaryData);

      // Step 3: Return PDF as file
      const endTime = Date.now();
      const latencyMs = endTime - startTime;

      this.logger.log(
        `Hospital summary PDF generated in ${latencyMs}ms for group: ${dto.groupId}`,
      );

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="hospital-summary-${summaryData.fullName}-${
          new Date().toISOString().split('T')[0]
        }.pdf"`,
      );
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('X-Generation-Latency-Ms', latencyMs.toString());

      // Send PDF
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to generate hospital summary PDF:`, error);

      // Return error response
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

  /**
   * (Optional) Endpoint to get just the summary data without PDF
   * Useful for debugging and testing
   * POST /api/hospital-summary/assemble
   */
  @Post('assemble')
  async assembleSummaryData(
    @Body() dto: { groupId: string },
  ): Promise<HospitalSummaryData> {
    try {
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
