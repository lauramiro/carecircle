import { Module } from '@nestjs/common';
import { SupabaseAdminModule } from '../integrations/supabase-admin.module';
import { DocumentStorageController } from './document-storage.controller';
import { DocumentStorageService } from './document-storage.service';

@Module({
  imports: [SupabaseAdminModule],
  controllers: [DocumentStorageController],
  providers: [DocumentStorageService],
  exports: [DocumentStorageService],
})
export class DocumentStorageModule {}