import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Lightweight health/smoke endpoint for confirming the API process is up.
   *
   * This intentionally avoids database or third-party calls so load balancers,
   * deployment checks, and local developers can distinguish "Nest is running"
   * from deeper dependency health.
   *
   * @returns Plain-text API smoke-check message.
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
