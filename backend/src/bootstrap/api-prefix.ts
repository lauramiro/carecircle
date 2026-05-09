import { INestApplication } from '@nestjs/common';

export const apiPrefix = 'api';

export function applyApiPrefix(app: INestApplication) {
  app.setGlobalPrefix(apiPrefix);
}
