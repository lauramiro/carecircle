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