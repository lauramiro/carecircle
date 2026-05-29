import { Global, Module } from '@nestjs/common';
import { AppConfigModule } from '../config/app-config.module';
import { AlertRepository } from './repositories/alert.repository';
import { CareGroupRepository } from './repositories/care-group.repository';
import { ChecklistRepository } from './repositories/checklist.repository';
import { MedicationRepository } from './repositories/medication.repository';
import { PatientRepository } from './repositories/patient.repository';
import { PushSubscriptionRepository } from './repositories/push-subscription.repository';
import { SupabaseAdminClient } from './supabase-admin.client';

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [
    SupabaseAdminClient,
    ChecklistRepository,
    MedicationRepository,
    AlertRepository,
    CareGroupRepository,
    PushSubscriptionRepository,
    PatientRepository,
  ],
  exports: [
    SupabaseAdminClient,
    ChecklistRepository,
    MedicationRepository,
    AlertRepository,
    CareGroupRepository,
    PushSubscriptionRepository,
    PatientRepository,
  ],
})
export class SupabaseAdminModule {}
