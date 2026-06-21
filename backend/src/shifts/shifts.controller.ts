import { Body, Controller, Post, HttpException, HttpStatus } from '@nestjs/common';
import { ShiftsService } from './shifts.service';

export interface AssignShiftDto {
  groupId: string;
  shiftDate: string;
  slot: string;
  assignedCaregiverId: string | null;
}

@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post('assignments')
  async assignShift(@Body() dto: AssignShiftDto) {
    try {
      return await this.shiftsService.assignShift(dto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Unable to save shift assignment', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
