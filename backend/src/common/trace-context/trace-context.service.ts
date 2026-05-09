import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

interface TraceStore {
  traceId: string;
}

@Injectable()
export class TraceContextService {
  private readonly storage = new AsyncLocalStorage<TraceStore>();

  run<T>(traceId: string, callback: () => T): T {
    return this.storage.run({ traceId }, callback);
  }

  getTraceId(): string | undefined {
    return this.storage.getStore()?.traceId;
  }
}
