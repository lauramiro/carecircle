import { Global, Module } from '@nestjs/common';
import { TraceContextService } from './trace-context.service';
import { TraceMiddleware } from './trace.middleware';

@Global()
@Module({
  providers: [TraceContextService, TraceMiddleware],
  exports: [TraceContextService, TraceMiddleware],
})
export class TraceContextModule {}
