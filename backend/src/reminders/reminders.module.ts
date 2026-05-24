import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/app-config.module';
import { AlertsModule } from '../alerts/alerts.module';
import { SupabaseAdminModule } from '../integrations/supabase-admin.module';
import { GmailMailerService } from '../email/gmail-mailer.service';
import { RemindersService } from './reminders.service';

@Module({
  imports: [AppConfigModule, AlertsModule, SupabaseAdminModule],
  providers: [RemindersService, GmailMailerService],
})
export class RemindersModule {}
