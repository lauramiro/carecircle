import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { IsOptional, IsString, Matches } from 'class-validator';
import { DevOnlyGuard } from '../common/guards/dev-only.guard';
import { AppConfigService } from '../config/app-config.service';
import { TwilioSmsService } from './twilio-sms.service';

class DevSmsTestBodyDto {
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'to must be E.164 (e.g. +447911123456)',
  })
  to?: string;
}

/**
 * Development-only: verify Twilio wiring without logging sensitive payloads (CC-100).
 */
@Controller('dev/sms')
@UseGuards(DevOnlyGuard)
export class DevSmsController {
  constructor(
    private readonly twilioSms: TwilioSmsService,
    private readonly appConfig: AppConfigService,
  ) {}

  @Post('test')
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async sendTest(@Body() body: DevSmsTestBodyDto) {
    const to =
      body.to?.trim() ||
      this.appConfig.config.TWILIO_DEV_TEST_TO_NUMBER?.trim() ||
      '';
    if (!to) {
      return {
        ok: false,
        error: 'missing_destination',
        message:
          'Provide `to` in the JSON body or set TWILIO_DEV_TEST_TO_NUMBER in the environment.',
      };
    }

    if (!this.twilioSms.isConfigured()) {
      return {
        ok: false,
        error: 'twilio_not_configured',
        message: 'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.',
      };
    }

    const result = await this.twilioSms.sendSms(to, 'CareCircle SMS connectivity test.');
    if ('error' in result) {
      return { ok: false, error: result.error };
    }
    return { ok: true, sid: result.sid };
  }
}
