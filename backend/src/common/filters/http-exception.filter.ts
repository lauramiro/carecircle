import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppConfigService } from '../../config/app-config.service';
import { LoggerService } from '../../logger/logger.service';
import { TraceContextService } from '../trace-context/trace-context.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(HttpExceptionFilter.name) private readonly logger: LoggerService,
    private readonly appConfigService: AppConfigService,
    private readonly traceContextService: TraceContextService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest<Request>();
    const statusCode = this.getStatusCode(exception);
    const message = this.getMessage(exception);
    const stack = exception instanceof Error ? exception.stack : undefined;
    const path = request.originalUrl ?? request.url;

    this.logger.error('HTTP request failed', {
      statusCode,
      path,
      message,
      ...(this.appConfigService.config.NODE_ENV !== 'production' && stack
        ? { stack }
        : {}),
    });

    response.status(statusCode).json({
      statusCode,
      message,
      path,
      traceId: this.traceContextService.getTraceId() ?? null,
      timestamp: new Date().toISOString(),
    });
  }

  private getStatusCode(exception: unknown): number {
    return exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getMessage(exception: unknown): string {
    if (!(exception instanceof HttpException)) {
      return 'Internal server error';
    }

    const response = exception.getResponse();
    if (typeof response === 'string') return response;
    if (this.hasMessage(response))
      return this.normalizeMessage(response.message);

    return exception.message;
  }

  private hasMessage(value: unknown): value is { message: string | string[] } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'message' in value &&
      (typeof value.message === 'string' || Array.isArray(value.message))
    );
  }

  private normalizeMessage(message: string | string[]): string {
    return Array.isArray(message) ? message.join(', ') : message;
  }
}
