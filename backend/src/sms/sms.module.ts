import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/app-config.module';
import { DevSmsController } from './dev-sms.controller';
import { TwilioSmsService } from './twilio-sms.service';

@Module({
  imports: [AppConfigModule],
  controllers: [DevSmsController],
  providers: [TwilioSmsService],
  exports: [TwilioSmsService],
})
export class SmsModule {}
