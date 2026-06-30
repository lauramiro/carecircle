import {
  Body,
  Controller,
  Post,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { AssignShiftDto } from './dto/assign-shift.dto';

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
      throw new HttpException(
        'Unable to save shift assignment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
