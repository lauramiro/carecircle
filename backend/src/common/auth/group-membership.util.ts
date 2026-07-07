import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { SupabaseAdminClient } from '../../integrations/supabase-admin.client';

/**
 * When a bearer token is present, verify the caller is an active member of the group.
 * When absent, no-op — preserves backward compatibility for smoke tests and legacy callers.
 */
export async function assertGroupMemberIfTokenPresent(
  supabase: SupabaseAdminClient,
  groupId: string,
  accessToken?: string,
): Promise<void> {
  const token = accessToken?.trim();
  if (!token) {
    if (process.env.NODE_ENV === 'test') return;
    throw new UnauthorizedException('Missing bearer token.');
  }

  const client = supabase.getClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser(token);

  if (userError || !user) {
    throw new UnauthorizedException('Invalid or expired bearer token.');
  }

  const { data: membership, error: membershipError } = await client
    .from('care_givers')
    .select('id')
    .eq('group_id', groupId)
    .eq('caregiver_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (membershipError) {
    throw new ForbiddenException('Unable to verify care circle access.');
  }

  if (!membership) {
    throw new ForbiddenException('You do not have access to this care circle.');
  }
}

export function extractBearerToken(
  authorizationHeader?: string,
): string | undefined {
  return authorizationHeader?.replace(/^Bearer\s+/i, '').trim() || undefined;
}
