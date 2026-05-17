import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppConfigService } from '../config/app-config.service';
import { isE164Phone } from '../common/validation/e164';

/**
 * Supabase client with the service role key — required for server-side reads
 * (e.g. carer phone numbers) that bypass anon RLS. Never expose this key to clients.
 */
@Injectable()
export class SupabaseAdminService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SupabaseAdminService.name);
  private client: SupabaseClient | null = null;

  constructor(private readonly appConfig: AppConfigService) {}

  onModuleInit(): void {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = this.appConfig.config;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      this.logger.warn('Supabase service role not configured; SMS recipient lookup disabled');
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

  /** For server-only realtime subscriptions (e.g. CC-102). Do not expose to HTTP layer. */
  getClientOrNull(): SupabaseClient | null {
    return this.client;
  }

  /** Active group members with an E.164 mobile stored on their profile. */
  async listSmsRecipientPhonesForGroup(groupId: string): Promise<string[]> {
    if (!this.client) return [];

    const { data, error } = await this.client
      .from('care_givers')
      .select('care_giver_id, profiles(phone)')
      .eq('group_id', groupId)
      .eq('status', 'active');

    if (error) {
      this.logger.warn(`recipient_lookup_failed code=${error.code ?? 'unknown'}`);
      return [];
    }

    const phones: string[] = [];
    for (const row of data ?? []) {
      const p = row as { profiles?: { phone?: string | null } | null };
      const raw = p.profiles?.phone?.trim();
      if (raw && isE164Phone(raw)) phones.push(raw);
    }
    return [...new Set(phones)];
  }

  /** First word of the care recipient display name for SMS salutation. */
  async getPatientSmsSalutation(groupId: string): Promise<string> {
    if (!this.client) return 'Your loved one';

    const { data, error } = await this.client
      .from('care_group')
      .select('patients(full_name)')
      .eq('id', groupId)
      .maybeSingle();

    if (error || !data) {
      return 'Your loved one';
    }

    const row = data as { patients?: { full_name?: string | null } | null };
    const full = row.patients?.full_name?.trim() ?? '';
    if (!full) return 'Your loved one';
    return full.split(/\s+/)[0] ?? 'Your loved one';
  }
}
