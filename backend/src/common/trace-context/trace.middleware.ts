import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TraceContextService } from './trace-context.service';
import { getTraceIdFromRequest } from './trace-context.utils';

@Injectable()
export class TraceMiddleware implements NestMiddleware {
  constructor(private readonly traceContextService: TraceContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const traceId = getTraceIdFromRequest(req);

    res.setHeader('x-trace-id', traceId);
    this.traceContextService.run(traceId, next);
  }
}
