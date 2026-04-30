import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { LoggerService } from './logger/logger.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(AppController.name) private readonly logger: LoggerService,
  ) {}

  @Get()
  getHello(): string {
    this.logger.log('Handling hello request');
    return this.appService.getHello();
  }
}
