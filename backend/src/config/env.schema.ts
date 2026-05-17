import { z } from 'zod';

export const appConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().int().positive().max(65535),
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  GROQ_API_KEY: z.string().min(1),
  FRONTEND_PUBLIC_URL: z.url().optional(),
  GMAIL_USER: z.email().optional(),
  GMAIL_APP_PASSWORD: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(1).optional(),
  MAIL_FROM_NAME: z.string().min(1).optional(),
  /** Service role — server only; enables SMS recipient lookup and realtime cancel (CC-101/CC-102). */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  /**
   * Shared secret for `POST /api/internal/missed-medication/push-dispatched`.
   * Set in production alongside your push worker; omit to disable the endpoint.
   */
  INTERNAL_MISSED_MED_SMS_KEY: z.string().min(1).optional(),
  /** Twilio — never commit real values; set only in deployment env or local `.env`. */
  TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  /** E.164 sender number, e.g. +15551234567 */
  TWILIO_FROM_NUMBER: z.string().min(1).optional(),
  /** Optional default recipient for `POST /api/dev/sms/test` in development */
  TWILIO_DEV_TEST_TO_NUMBER: z.string().min(1).optional(),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export function validateEnv(config: Record<string, unknown>): AppConfig {
  const result = appConfigSchema.safeParse(config);
  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Invalid environment configuration: ${errors}`);
  }
  return result.data;
}
