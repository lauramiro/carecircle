import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { DevOnlyGuard } from '../common/guards/dev-only.guard';
import { RemindersService } from './reminders.service';

@Controller('dev/reminders')
@UseGuards(DevOnlyGuard)
export class DevRemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  /** Runs the appointment and wellbeing reminder checks immediately in local development. */
  @Post('run')
  @HttpCode(200)
  async runNow() {
    await this.remindersService.runReminderCheckAt(new Date());
    return { ok: true };
  }
}
