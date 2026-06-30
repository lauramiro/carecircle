import { Module } from '@nestjs/common';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';
import { ShiftsRepository } from '../integrations/repositories/shifts.repository';
import { SupabaseAdminModule } from '../integrations/supabase-admin.module';

@Module({
  imports: [SupabaseAdminModule],
  controllers: [ShiftsController],
  providers: [ShiftsService, ShiftsRepository],
  exports: [ShiftsService],
})
export class ShiftsModule {}
