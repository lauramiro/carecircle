import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { DevOnlyGuard } from '../common/guards/dev-only.guard';
import { PushDispatchService } from './push-dispatch.service';

class DevPushTestBodyDto {
  @IsUUID()
  userId!: string;
}

@Controller('dev/push')
@UseGuards(DevOnlyGuard)
export class DevPushController {
  constructor(private readonly pushDispatch: PushDispatchService) {}

  /**
   * Sends a generic Web Push test to every subscription for one user.
   *
   * Guarded by DevOnlyGuard and intentionally free of patient data so developers
   * can verify push wiring without sending protected health details through a
   * diagnostic endpoint.
   *
   * @param body Request body containing the target `userId`.
   * @returns `{ ok: true }` when dispatch is attempted successfully.
   * @throws Error Propagates validation, guard, or push-dispatch failures.
   */
  @Post('test')
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async sendTest(@Body() body: DevPushTestBodyDto) {
    await this.pushDispatch.sendToUsers([body.userId], {
      title: 'CareCircle test',
      body: 'Push notifications are working.',
      url: '/',
    });
    return { ok: true };
  }
}
