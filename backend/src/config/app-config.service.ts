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
    };
  }
}
