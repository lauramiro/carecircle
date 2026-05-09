import { Global, Module } from '@nestjs/common';
import { AppController } from '../app.controller';
import { AppService } from '../app.service';
import {
  createLoggerProvider,
  winstonLoggerProvider,
} from './logger.providers';

const contextLoggerProviders = [
  createLoggerProvider(AppController.name),
  createLoggerProvider(AppService.name),
  createLoggerProvider('LoggingInterceptor'),
  createLoggerProvider('HttpExceptionFilter'),
];

@Global()
@Module({
  providers: [winstonLoggerProvider, ...contextLoggerProviders],
  exports: [...contextLoggerProviders],
})
export class LoggerModule {}
