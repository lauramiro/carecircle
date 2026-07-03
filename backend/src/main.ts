import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { applyApiPrefix } from './bootstrap/api-prefix';
import { applyValidationPipe } from './bootstrap/validation-pipe';
import { AppConfigService } from './config/app-config.service';
import { buildCorsOptions } from './config/cors.config';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { setDefaultResultOrder } from 'node:dns';

// Render's outbound network doesn't route IPv6, but Node's default DNS
// resolution can still return an IPv6 address first for hosts like
// smtp.gmail.com, causing ENETUNREACH. Prefer IPv4 results app-wide.
setDefaultResultOrder('ipv4first');

async function bootstrap() {
  // Load env before ConfigModule.forRoot resolves — its envFilePath can silently
  // miss on Windows when process.cwd() differs from the backend root.
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const backendRoot = resolve(__dirname, '..');
  for (const candidate of [
    resolve(backendRoot, `.env.${nodeEnv}`),
    resolve(backendRoot, '.env'),
  ]) {
    if (existsSync(candidate)) {
      (
        process as NodeJS.Process & { loadEnvFile?(path: string): void }
      ).loadEnvFile?.(candidate);
      break;
    }
  }

  const app = await NestFactory.create(AppModule);
  const appConfigService = app.get(AppConfigService);
  const config = appConfigService.config;

  app.enableCors(buildCorsOptions(config));
  applyApiPrefix(app);
  applyValidationPipe(app);

  await app.listen(config.PORT);
}
void bootstrap();
