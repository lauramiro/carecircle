import { Inject, Injectable } from '@nestjs/common';
import { Logger as WinstonLogger } from 'winston';
import { TraceContextService } from '../common/trace-context/trace-context.service';
import { WINSTON_LOGGER } from './logger.tokens';

export type LogMetadata = Record<string, unknown>;

@Injectable()
export class LoggerService {
  constructor(
    private readonly context: string,
    private readonly traceContextService: TraceContextService,
    @Inject(WINSTON_LOGGER) private readonly logger: WinstonLogger,
  ) {}

  log(message: string, metadata?: LogMetadata) {
    this.write('info', message, metadata);
  }

  warn(message: string, metadata?: LogMetadata) {
    this.write('warn', message, metadata);
  }

  error(message: string, metadata?: LogMetadata) {
    this.write('error', message, metadata);
  }

  debug(message: string, metadata?: LogMetadata) {
    this.write('debug', message, metadata);
  }

  verbose(message: string, metadata?: LogMetadata) {
    this.write('verbose', message, metadata);
  }

  private write(level: string, message: string, metadata: LogMetadata = {}) {
    this.logger.log({
      level,
      context: this.context,
      traceId: this.traceContextService.getTraceId() ?? null,
      message,
      ...metadata,
    });
  }
}
