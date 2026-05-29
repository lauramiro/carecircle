import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TraceContextInterceptor } from './common/trace-context/trace-context.interceptor';
import { TraceContextModule } from './common/trace-context/trace-context.module';
import { TraceMiddleware } from './common/trace-context/trace.middleware';
import { AppConfigModule } from './config/app-config.module';
import { LoggerModule } from './logger/logger.module';
import { AppThrottlingModule } from './throttling/throttling.module';
import { AiModule } from './ai/ai.module';
import { InvitesModule } from './invites/invites.module';
import { HospitalSummaryModule } from './hospital-summary/hospital-summary.module';
import { SmsModule } from './sms/sms.module';
import { SupabaseAdminModule } from './integrations/supabase-admin.module';
import { ChecklistModule } from './checklist/checklist.module';
import { AlertsModule } from './alerts/alerts.module';
import { MedicationsModule } from './medications/medications.module';
import { CronModule } from './cron/cron.module';
import { RemindersModule } from './reminders/reminders.module';
import { InsightsModule } from './insights/insights.module';


@Module({
  imports: [
    AppConfigModule,
    TraceContextModule,
    LoggerModule,
    AppThrottlingModule,
    SupabaseAdminModule,
    InvitesModule,
    AiModule,
    HospitalSummaryModule,
    SmsModule,
    ChecklistModule,
    AlertsModule,
    MedicationsModule,
    CronModule,
    RemindersModule,
    InsightsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TraceContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TraceMiddleware).forRoutes(AppController);
  }
}
