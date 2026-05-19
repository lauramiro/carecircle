import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TraceContextInterceptor } from './common/trace-context/trace-context.interceptor';
import { TraceContextModule } from './common/trace-context/trace-context.module';
import { TraceMiddleware } from './common/trace-context/trace.middleware';
import { AppConfigModule } from './config/app-config.module';
import { LoggerModule } from './logger/logger.module';
import { AppThrottlingModule } from './throttling/throttling.module';
import { InvitesModule } from './invites/invites.module';

@Module({
  imports: [
    AppConfigModule,
    TraceContextModule,
    LoggerModule,
    AppThrottlingModule,
    InvitesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TraceContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TraceMiddleware).forRoutes(AppController);
  }
}
