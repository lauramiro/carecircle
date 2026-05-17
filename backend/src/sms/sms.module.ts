import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/app-config.module';
import { SupabaseAdminService } from '../integrations/supabase-admin.service';
import { DevSmsController } from './dev-sms.controller';
import { InternalMissedMedicationController } from './internal/internal-missed-medication.controller';
import { InternalMissedMedSmsGuard } from './internal/internal-missed-med-sms.guard';
import { MissedMedicationSmsCoordinator } from './missed-medication-sms.coordinator';
import { PendingSmsRegistry } from './pending-sms.registry';
import { TwilioSmsService } from './twilio-sms.service';

@Module({
  imports: [AppConfigModule],
  controllers: [DevSmsController, InternalMissedMedicationController],
  providers: [
    TwilioSmsService,
    SupabaseAdminService,
    PendingSmsRegistry,
    MissedMedicationSmsCoordinator,
    InternalMissedMedSmsGuard,
  ],
  exports: [TwilioSmsService, MissedMedicationSmsCoordinator],
})
export class SmsModule {}
