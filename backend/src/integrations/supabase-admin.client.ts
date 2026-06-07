import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class SupabaseAdminClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SupabaseAdminClient.name);
  private client: SupabaseClient | null = null;

  constructor(private readonly appConfig: AppConfigService) {}

  onModuleInit(): void {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = this.appConfig.config;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      this.logger.warn(
        'Supabase service role not configured; server-side DB operations disabled',
      );
      return;
    }
    this.client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }

  onModuleDestroy(): void {
    this.client = null;
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  /** Internal use by repositories and realtime subscriber only. */
  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase service role client is not configured');
    }
    return this.client;
  }
}
