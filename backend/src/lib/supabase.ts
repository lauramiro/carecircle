import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? '';
// Prefer an explicit service role key when present (safer for server-side operations).
const supabaseKey =
	process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

// Log which key type is being used (do not print the key itself).
if (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY) {
	// eslint-disable-next-line no-console
	console.log('Supabase client: using service role key');
} else if (process.env.SUPABASE_ANON_KEY) {
	// eslint-disable-next-line no-console
	console.log('Supabase client: using anon key');
} else {
	// eslint-disable-next-line no-console
	console.warn('Supabase client: no key provided (SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY)');
}

export const supabase = createClient(supabaseUrl, supabaseKey);