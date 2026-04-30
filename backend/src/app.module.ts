import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TraceContextModule } from './common/trace-context/trace-context.module';
import { TraceMiddleware } from './common/trace-context/trace.middleware';
import { AppConfigModule } from './config/app-config.module';
import { LoggerModule } from './logger/logger.module';
import { AppThrottlingModule } from './throttling/throttling.module';

@Module({
  imports: [
    AppConfigModule,
    TraceContextModule,
    LoggerModule,
    AppThrottlingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TraceMiddleware).forRoutes('*');
  }
}
