import { apiUrl } from '@lib/apiBaseUrl';
import { supabase } from '@lib/supabaseClient';

export async function authenticatedFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return fetch(apiUrl(path), { ...init, headers });
}

/** Session bearer token for axios/fetch callers that manage headers themselves. */
export async function getAccessToken(): Promise<string | undefined> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token;
}
