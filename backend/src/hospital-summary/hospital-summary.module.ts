import { Module } from '@nestjs/common';
import { HospitalSummaryController } from './hospital-summary.controller';
import { HospitalSummaryService } from './hospital-summary.service';
import { PDFGenerationService } from './pdf-generation.service';
 
@Module({
  controllers: [HospitalSummaryController],
  providers: [HospitalSummaryService, PDFGenerationService],
  exports: [HospitalSummaryService, PDFGenerationService],
})
export class HospitalSummaryModule {}