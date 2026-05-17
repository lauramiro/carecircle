import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MissedMedicationSmsCoordinator } from '../missed-medication-sms.coordinator';
import { InternalMissedMedSmsGuard } from './internal-missed-med-sms.guard';
import { PushDispatchedDto } from './push-dispatched.dto';

@Controller('internal/missed-medication')
@UseGuards(InternalMissedMedSmsGuard)
export class InternalMissedMedicationController {
  constructor(private readonly coordinator: MissedMedicationSmsCoordinator) {}

  /** Call when a missed-medication push has been sent (schedules SMS in 10 minutes). */
  @Post('push-dispatched')
  @HttpCode(204)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  pushDispatched(@Body() body: PushDispatchedDto): void {
    this.coordinator.scheduleAfterPushDispatched({
      checklistItemId: body.checklistItemId,
      groupId: body.groupId,
      medicationName: body.medicationName,
      doseSummary: body.doseSummary,
      minutesOverdue: body.minutesOverdue,
    });
  }
}
