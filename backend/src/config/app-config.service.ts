import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './env.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  get config(): AppConfig {
    return {
      NODE_ENV: this.configService.get('NODE_ENV', { infer: true }),
      PORT: this.configService.get('PORT', { infer: true }),
      SUPABASE_URL: this.configService.get('SUPABASE_URL', { infer: true }),
      SUPABASE_ANON_KEY: this.configService.get('SUPABASE_ANON_KEY', { infer: true }),
      GROQ_API_KEY: this.configService.get('GROQ_API_KEY', { infer: true }),
      FRONTEND_PUBLIC_URL: this.configService.get('FRONTEND_PUBLIC_URL', { infer: true }),
      GMAIL_USER: this.configService.get('GMAIL_USER', { infer: true }),
      GMAIL_APP_PASSWORD: this.configService.get('GMAIL_APP_PASSWORD', { infer: true }),
      MAIL_FROM: this.configService.get('MAIL_FROM', { infer: true }),
      MAIL_FROM_NAME: this.configService.get('MAIL_FROM_NAME', { infer: true }),
      TWILIO_ACCOUNT_SID: this.configService.get('TWILIO_ACCOUNT_SID', { infer: true }),
      TWILIO_AUTH_TOKEN: this.configService.get('TWILIO_AUTH_TOKEN', { infer: true }),
      TWILIO_FROM_NUMBER: this.configService.get('TWILIO_FROM_NUMBER', { infer: true }),
      TWILIO_DEV_TEST_TO_NUMBER: this.configService.get('TWILIO_DEV_TEST_TO_NUMBER', { infer: true }),
    };
  }
}
