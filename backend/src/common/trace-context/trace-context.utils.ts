import { Request } from 'express';
import { randomUUID } from 'node:crypto';

function getFirstHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function getTraceIdFromRequest(request: Request): string {
  return (
    getFirstHeaderValue(request.headers['x-trace-id']) ??
    getFirstHeaderValue(request.headers['x-request-id']) ??
    randomUUID()
  );
}
