import { Provider } from '@nestjs/common';
import {
  createLogger,
  format,
  Logger as WinstonLogger,
  transports,
} from 'winston';
import { TraceContextService } from '../common/trace-context/trace-context.service';
import { LoggerService } from './logger.service';
import { WINSTON_LOGGER } from './logger.tokens';

export const winstonLoggerProvider: Provider = {
  provide: WINSTON_LOGGER,
  useFactory: () =>
    createLogger({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: format.combine(format.timestamp(), format.json()),
      transports: [new transports.Console()],
    }),
};

export function createLoggerProvider(context: string): Provider<LoggerService> {
  return {
    provide: context,
    useFactory: (
      traceContextService: TraceContextService,
      logger: WinstonLogger,
    ) => new LoggerService(context, traceContextService, logger),
    inject: [TraceContextService, WINSTON_LOGGER],
  };
}
