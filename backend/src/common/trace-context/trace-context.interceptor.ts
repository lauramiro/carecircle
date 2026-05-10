import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { TraceContextService } from './trace-context.service';
import { getTraceIdFromRequest } from './trace-context.utils';

@Injectable()
export class TraceContextInterceptor implements NestInterceptor {
  constructor(private readonly traceContextService: TraceContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const activeTraceId = this.traceContextService.getTraceId();
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const traceId = activeTraceId ?? getTraceIdFromRequest(request);

    response.setHeader('x-trace-id', traceId);

    if (activeTraceId) {
      return next.handle();
    }

    return new Observable((subscriber) =>
      this.traceContextService.run(traceId, () => {
        const subscription = next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (error: unknown) => subscriber.error(error),
          complete: () => subscriber.complete(),
        });

        return () => subscription.unsubscribe();
      }),
    );
  }
}
