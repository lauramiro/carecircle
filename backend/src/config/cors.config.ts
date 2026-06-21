import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { AppConfig } from './env.schema';

const developmentOriginPattern = /^http:\/\/localhost(?::\d+)?$/;
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
          : config.FRONTEND_PUBLIC_URL
            ? origin === config.FRONTEND_PUBLIC_URL.replace(/\/$/, '')
            : false;

      callback(null, allowed);
    },
  };
}
