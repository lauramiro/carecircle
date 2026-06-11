import { Module } from '@nestjs/common';
import { SupabaseAdminModule } from '../integrations/supabase-admin.module';
import { HospitalSummaryController } from './hospital-summary.controller';
import { HospitalSummaryService } from './hospital-summary.service';
import { PDFGenerationService } from './pdf-generation.service';

@Module({
  imports: [SupabaseAdminModule],
  controllers: [HospitalSummaryController],
  providers: [HospitalSummaryService, PDFGenerationService],
  exports: [HospitalSummaryService, PDFGenerationService],
})
export class HospitalSummaryModule {}