import { supabase } from './supabaseClient';

type RpcArgs = Record<string, unknown>;

/** Call RPC functions not yet present in generated Database types. */
export async function callRpc<T = unknown>(fn: string, args: RpcArgs) {
  const result = await supabase.rpc(fn as never, args as never);
  return result as { data: T; error: { message: string } | null };
}

/** Filter on columns not yet present in generated Database types. */
export function eqExtendedColumn<Q extends { eq: (column: string, value: string) => Q }>(
  builder: Q,
  column: string,
  value: string,
): Q {
  return builder.eq(column, value);
}
