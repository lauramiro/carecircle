import { Injectable } from '@nestjs/common';
import { SupabaseAdminClient } from '../supabase-admin.client';
import type { PushSubscriptionRecord } from '../types';

@Injectable()
export class PushSubscriptionRepository {
  constructor(private readonly supabase: SupabaseAdminClient) {}

  async findByUserIds(userIds: string[]): Promise<PushSubscriptionRecord[]> {
    if (userIds.length === 0) return [];

    const { data, error } = await this.supabase
      .getClient()
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds);

    if (error) throw new Error(error.message);
    return (data ?? []) as PushSubscriptionRecord[];
  }

  async upsert(subscription: {
    userId: string;
    platform: 'web_push' | 'fcm';
    endpoint: string;
    p256dh?: string;
    auth?: string;
    userAgent?: string;
  }): Promise<PushSubscriptionRecord> {
    const { data, error } = await this.supabase
      .getClient()
      .from('push_subscriptions')
      .upsert(
        {
          user_id: subscription.userId,
          platform: subscription.platform,
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh ?? null,
          auth: subscription.auth ?? null,
          user_agent: subscription.userAgent ?? null,
        },
        { onConflict: 'user_id,endpoint' },
      )
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return data as PushSubscriptionRecord;
  }

  async deleteById(id: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .getClient()
      .from('push_subscriptions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (error) throw new Error(error.message);
    return (data?.length ?? 0) > 0;
  }
}
