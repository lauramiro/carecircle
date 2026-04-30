import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { TraceContextService } from './trace-context.service';

function getFirstHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

@Injectable()
export class TraceMiddleware implements NestMiddleware {
  constructor(private readonly traceContextService: TraceContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const traceId =
      getFirstHeaderValue(req.headers['x-trace-id']) ??
      getFirstHeaderValue(req.headers['x-request-id']) ??
      randomUUID();

    res.setHeader('x-trace-id', traceId);
    this.traceContextService.run(traceId, next);
  }
}
