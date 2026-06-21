import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ProfileService } from './profile.service';
import { AppConfigModule } from '../config/app-config.module';
import { SupabaseAdminModule } from '../integrations/supabase-admin.module';

@Module({
  imports: [AppConfigModule, SupabaseAdminModule],
  controllers: [AiController],
  providers: [AiService, ProfileService],
  exports: [AiService],
})
export class AiModule {}
