import { describe, expect, it } from 'vitest';
import { buildCorsOptions } from './cors.config';
import type { AppConfig } from './env.schema';

function baseConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    NODE_ENV: 'development',
    PORT: 3000,
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'anon-key',
    GROQ_API_KEY: 'groq-key',
    CRON_ENABLED: 'true',
    ...overrides,
  };
}

async function isOriginAllowed(
  config: AppConfig,
  origin: string | undefined,
): Promise<boolean> {
  const { origin: originCheck } = buildCorsOptions(config);
  return new Promise((resolve, reject) => {
    if (typeof originCheck !== 'function') {
      reject(new Error('Expected CORS origin callback'));
      return;
    }

    originCheck(origin, (error, allowed) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(Boolean(allowed));
    });
  });
}

describe('buildCorsOptions', () => {
  it('throws in production when FRONTEND_PUBLIC_URL is unset', () => {
    expect(() =>
      buildCorsOptions(baseConfig({ NODE_ENV: 'production' })),
    ).toThrow(/FRONTEND_PUBLIC_URL must be set in production/);
  });

  it('allows localhost origins in development', async () => {
    await expect(
      isOriginAllowed(baseConfig(), 'http://localhost:5173'),
    ).resolves.toBe(true);
    await expect(
      isOriginAllowed(baseConfig(), 'http://localhost:3000'),
    ).resolves.toBe(true);
  });

  it('rejects non-localhost origins in development', async () => {
    await expect(
      isOriginAllowed(baseConfig(), 'https://carecircle-frontend.onrender.com'),
    ).resolves.toBe(false);
  });

  it('allows only FRONTEND_PUBLIC_URL in production', async () => {
    const config = baseConfig({
      NODE_ENV: 'production',
      FRONTEND_PUBLIC_URL: 'https://carecircle-frontend.onrender.com/',
    });

    await expect(
      isOriginAllowed(config, 'https://carecircle-frontend.onrender.com'),
    ).resolves.toBe(true);
    await expect(
      isOriginAllowed(config, 'https://carecircle.com'),
    ).resolves.toBe(false);
  });

  it('allows requests with no Origin header', async () => {
    await expect(isOriginAllowed(baseConfig(), undefined)).resolves.toBe(true);
  });
});
