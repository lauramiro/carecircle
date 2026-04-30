import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { AppConfig } from './env.schema';

const developmentOriginPattern = /^http:\/\/localhost(?::\d+)?$/;
const productionOrigin = 'https://carecircle.com';

export function buildCorsOptions(config: AppConfig): CorsOptions {
  return {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const allowed =
        config.NODE_ENV === 'development'
          ? developmentOriginPattern.test(origin)
          : origin === productionOrigin;

      callback(allowed ? null : new Error('Not allowed by CORS'), allowed);
    },
  };
}
