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

  /** Sends a test Web Push to every subscription for the given user (development only). */
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
