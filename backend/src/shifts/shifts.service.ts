import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ShiftsRepository } from '../integrations/repositories/shifts.repository';
import { AssignShiftDto } from './dto/assign-shift.dto';

@Injectable()
export class ShiftsService {
  private readonly logger = new Logger(ShiftsService.name);

  constructor(private readonly shiftsRepo: ShiftsRepository) {}

  async assignShift(dto: AssignShiftDto) {
    const isMember = await this.shiftsRepo.isMember(dto.groupId, dto.changedBy);
    if (!isMember) {
      throw new ForbiddenException('not_a_group_member');
    }

    if (dto.assignedCaregiverId) {
      const occupant = await this.shiftsRepo.getSlotOccupant(
        dto.groupId,
        dto.shiftDate,
        dto.slot,
      );
      if (occupant && occupant !== dto.assignedCaregiverId) {
        throw new HttpException(
          'This slot is already filled by someone else.',
          HttpStatus.CONFLICT,
        );
      }

      const conflictGroup = await this.shiftsRepo.getCarerSlotInOtherGroup(
        dto.assignedCaregiverId,
        dto.shiftDate,
        dto.slot,
        dto.groupId,
      );
      if (conflictGroup) {
        throw new HttpException(
          'This carer is already assigned to this slot in another group.',
          HttpStatus.CONFLICT,
        );
      }
    }

    const data = await this.shiftsRepo.upsertAssignment(dto);
    if (!data) {
      this.logger.error(
        `assignShift upsert returned no data group=${dto.groupId} date=${dto.shiftDate} slot=${dto.slot}`,
      );
      throw new HttpException(
        'Failed to save shift assignment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return data;
  }
}
