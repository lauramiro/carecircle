import { z } from 'zod';

const mailtoOrHttps = z
  .string()
  .min(1)
  .refine((v) => v.startsWith('mailto:') || v.startsWith('https://'), {
    message: 'Must be a mailto: or https:// URL',
  });

export const appConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().int().positive().max(65535),
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  GROQ_API_KEY: z.string().min(1),
  FRONTEND_PUBLIC_URL: z.url().optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(1).optional(),
  MAIL_FROM_NAME: z.string().min(1).optional(),
  /**
   * Service role — server only. Required for crons (checklist materialization, overdue alerts,
   * push/SMS dispatch) and admin reads/writes that bypass RLS. Never expose to clients.
   */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  /**
   * @deprecated Legacy CC-101 internal hook — removed.
   */
  INTERNAL_MISSED_MED_SMS_KEY: z.string().min(1).optional(),
  /** Twilio — never commit real values; set only in deployment env or local `.env`. */
  TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  /** E.164 sender number, e.g. +15551234567 */
  TWILIO_FROM_NUMBER: z.string().min(1).optional(),
  /** Optional default recipient for `POST /api/dev/sms/test` in development */
  TWILIO_DEV_TEST_TO_NUMBER: z.string().min(1).optional(),
  /** Web Push (VAPID) — generate with `npx web-push generate-vapid-keys` in backend/. */
  VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  /** Contact URI for push services, e.g. mailto:team@example.com */
  VAPID_SUBJECT: mailtoOrHttps.optional(),
  /** Set to `false` to disable Nest schedule crons (local tests). Default: enabled. */
  CRON_ENABLED: z.enum(['true', 'false']).optional().default('true'),
  /** Minutes after push before SMS fallback (default 10). */
  SMS_FALLBACK_DELAY_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .max(60)
    .optional(),
  /** Max checklist_items inserted per materialization batch (default 100). */
  MATERIALIZATION_BATCH_SIZE: z.coerce
    .number()
    .int()
    .positive()
    .max(500)
    .optional(),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export function validateEnv(config: Record<string, unknown>): AppConfig {
  // Accept legacy SUPABASE_SERVICE_KEY name locally; prefer SUPABASE_SERVICE_ROLE_KEY in new .env files.
  const normalized = { ...config };
  for (const key of [
    'FRONTEND_PUBLIC_URL',
    'RESEND_API_KEY',
    'MAIL_FROM',
    'MAIL_FROM_NAME',
    'SUPABASE_SERVICE_ROLE_KEY',
    'INTERNAL_MISSED_MED_SMS_KEY',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_FROM_NUMBER',
    'TWILIO_DEV_TEST_TO_NUMBER',
    'VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_SUBJECT',
    'SMS_FALLBACK_DELAY_MINUTES',
    'MATERIALIZATION_BATCH_SIZE',
  ]) {
    if (normalized[key] === '') {
      normalized[key] = undefined;
    }
  }

  if (
    !normalized.SUPABASE_SERVICE_ROLE_KEY &&
    typeof normalized.SUPABASE_SERVICE_KEY === 'string' &&
    normalized.SUPABASE_SERVICE_KEY.length > 0
  ) {
    normalized.SUPABASE_SERVICE_ROLE_KEY = normalized.SUPABASE_SERVICE_KEY;
  }

  const result = appConfigSchema.safeParse(normalized);
  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Invalid environment configuration: ${errors}`);
  }
  return result.data;
}

/** Parsed helpers (defaults applied after Zod parse). */
export function cronsEnabled(config: AppConfig): boolean {
  return config.CRON_ENABLED !== 'false';
}

export function smsFallbackDelayMinutes(config: AppConfig): number {
  return config.SMS_FALLBACK_DELAY_MINUTES ?? 10;
}

export function materializationBatchSize(config: AppConfig): number {
  return config.MATERIALIZATION_BATCH_SIZE ?? 100;
}
