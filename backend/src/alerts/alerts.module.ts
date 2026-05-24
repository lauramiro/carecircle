import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/app-config.module';
import { SmsModule } from '../sms/sms.module';
import { PushDispatchService } from './push-dispatch.service';
import { PushSubscriptionsController } from './push-subscriptions.controller';
import { SmsDispatchService } from './sms-dispatch.service';

@Module({
  imports: [AppConfigModule, SmsModule],
  controllers: [PushSubscriptionsController],
  providers: [PushDispatchService, SmsDispatchService],
  exports: [PushDispatchService, SmsDispatchService],
})
export class AlertsModule {}
