import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { IsISO8601, IsOptional } from 'class-validator';
import { DevOnlyGuard } from '../common/guards/dev-only.guard';
import { RemindersService } from './reminders.service';

class DevRunRemindersBodyDto {
  /** Optional ISO timestamp to evaluate reminders against; defaults to now. */
  @IsOptional()
  @IsISO8601()
  now?: string;
}

@Controller('dev/reminders')
@UseGuards(DevOnlyGuard)
export class DevRemindersController {
  constructor(private readonly reminders: RemindersService) {}

  /** Manually triggers the appointment and wellbeing reminder check (development only). */
  @Post('run')
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async run(@Body() body: DevRunRemindersBodyDto) {
    const now = body.now ? new Date(body.now) : new Date();
    await this.reminders.runReminderCheckAt(now);
    return { ok: true, ranAt: now.toISOString() };
  }
}
