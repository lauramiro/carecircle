import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { applyApiPrefix } from './bootstrap/api-prefix';
import { applyValidationPipe } from './bootstrap/validation-pipe';
import { AppConfigService } from './config/app-config.service';
import { buildCorsOptions } from './config/cors.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const appConfigService = app.get(AppConfigService);
  const config = appConfigService.config;

  app.enableCors(buildCorsOptions(config));
  applyApiPrefix(app);
  applyValidationPipe(app);

  await app.listen(config.PORT);
}
void bootstrap();
