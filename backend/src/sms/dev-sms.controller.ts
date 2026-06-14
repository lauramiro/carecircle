import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { DevOnlyGuard } from '../common/guards/dev-only.guard';
import { AppConfigService } from '../config/app-config.service';
import { DevSmsTestBodyDto } from './dto/dev-sms-test-body.dto';
import { TwilioSmsService } from './twilio-sms.service';

@Controller('dev/sms')
@UseGuards(DevOnlyGuard)
export class DevSmsController {
  constructor(
    private readonly twilioSms: TwilioSmsService,
    private readonly appConfig: AppConfigService,
  ) {}

  /**
   * Sends a generic SMS connectivity test in development environments only.
   *
   * The endpoint returns structured "not configured" responses instead of
   * throwing so setup screens and manual checks can clearly distinguish missing
   * Twilio configuration from provider delivery failures.
   *
   * @param body Optional request body containing `to`; when omitted, the
   * endpoint falls back to `TWILIO_DEV_TEST_TO_NUMBER`.
   * @returns Structured test result with `ok`, and either a Twilio `sid` or an
   * explanatory `error`/`message`.
   * @throws Error Propagates validation or unexpected Twilio service failures.
   */
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
        message:
          'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.',
      };
    }

    const result = await this.twilioSms.sendSms(
      to,
      'CareCircle SMS connectivity test.',
    );
    if ('error' in result) {
      return { ok: false, error: result.error };
    }
    return { ok: true, sid: result.sid };
  }
}
