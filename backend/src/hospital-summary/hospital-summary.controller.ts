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
import { HospitalSummaryService, HospitalSummaryData } from './hospital-summary.service';
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
    const { data, error } = await this.supabase.getClient()
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

    return data.id;
  }
 
  /**
   * Generates a downloadable hospital summary PDF for the patient in a group.
   *
   * Request body: `{ groupId: string }`
   * Response: `application/pdf`
   *
   * The handler resolves the patient server-side from the group ID so clients
   * cannot request arbitrary patient records by raw ID. It then assembles fresh
   * clinical/care-team data and returns validation warnings in headers while
   * still producing the PDF, because a partial but clearly marked summary is
   * more useful during handover than a hard failure for non-critical gaps.
   *
   * @param dto Request body containing `groupId`; the patient ID is resolved
   * server-side from this group.
   * @param res Express response used to stream the generated PDF and headers.
   * @returns Sends an `application/pdf` response; does not return a JSON body.
   * @throws HttpException when patient resolution, summary assembly, or PDF
   * rendering fails.
   */
  @Post('generate-pdf')
  async generateHospitalSummaryPDF(
    @Body() dto: { groupId: string },
    @Res() res: Response
  ) {
    const startTime = Date.now();
 
    try {
      const patientId = await this.resolvePatientId(dto.groupId);
      this.logger.log(
        `Generating hospital summary PDF for group: ${dto.groupId}, patient: ${patientId}`,
      );
 
      // Step 1: Assemble complete care profile (CC-134)
      const summaryData = await this.hospitalSummaryService.assembleHospitalSummary(
        patientId,
      );
 
      // Validate assembly was successful
      if (!summaryData.isValid) {
        this.logger.warn(
          `Hospital summary for group ${dto.groupId} has validation errors:`,
          summaryData.validationErrors,
        );
 
        // Still proceed with PDF generation, but include errors in response
        if (summaryData.validationErrors.length > 0) {
          res.set('X-Validation-Errors', JSON.stringify(summaryData.validationErrors));
        }
      }
 
      // Step 2: Generate PDF from assembled data (CC-135)
      const pdfBuffer = await this.pdfGenerationService.generateHospitalSummaryPDF(
        summaryData
      );
 
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
        `attachment; filename="hospital-summary-${summaryData.fullName}-${new Date()
          .toISOString()
          .split('T')[0]}.pdf"`
      );
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('X-Generation-Latency-Ms', latencyMs.toString());
 
      // Send PDF
      res.send(pdfBuffer);
    } catch (error) {
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
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
 
  /**
   * Assembles the hospital summary payload without rendering a PDF.
   *
   * This diagnostic route supports tests and frontend previews that need to
   * inspect the normalized summary data directly. It uses the same group-to-
   * patient resolution and validation path as PDF generation, so differences
   * between JSON preview and PDF output stay limited to rendering.
   *
   * @param dto Request body containing `groupId`; the patient ID is resolved
   * server-side from this group.
   * @returns Normalized `HospitalSummaryData` payload used by PDF generation.
   * @throws HttpException when patient resolution or summary assembly fails.
   */
  @Post('assemble')
  async assembleSummaryData(@Body() dto: { groupId: string }): Promise<HospitalSummaryData> {
    try {
      const patientId = await this.resolvePatientId(dto.groupId);
      this.logger.log(
        `Assembling hospital summary for group: ${dto.groupId}, patient: ${patientId}`,
      );
 
      const summaryData = await this.hospitalSummaryService.assembleHospitalSummary(
        patientId,
      );
 
      if (!summaryData.isValid) {
        this.logger.warn(
          `Hospital summary for group ${dto.groupId} has validation errors`,
          summaryData.validationErrors,
        );
      }
 
      return summaryData;
    } catch (error) {
      this.logger.error(`Failed to assemble hospital summary:`, error);
 
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            error instanceof Error ? error.message : 'Failed to assemble hospital summary',
          error: 'ASSEMBLY_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
