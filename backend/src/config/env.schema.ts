import { z } from 'zod';

export const appConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().int().positive().max(65535),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  /** Public web app origin (no trailing slash), e.g. https://app.example.com or http://localhost:5173 */
  FRONTEND_PUBLIC_URL: z.string().url().optional(),
  /** Gmail address used with an App Password (CC-150). */
  GMAIL_USER: z.string().email().optional(),
  /** Google Account App Password (not the normal Gmail password). */
  GMAIL_APP_PASSWORD: z.string().min(1).optional(),
  /** From header; defaults to GMAIL_USER. */
  MAIL_FROM: z.string().min(1).optional(),
  /** Optional display name for the From header. */
  MAIL_FROM_NAME: z.string().min(1).optional(),
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