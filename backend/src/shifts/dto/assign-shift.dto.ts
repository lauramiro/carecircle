import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

const SHIFT_SLOTS = ['morning', 'afternoon', 'evening', 'overnight'] as const;

export class AssignShiftDto {
  @IsUUID()
  groupId: string;

  @IsDateString()
  shiftDate: string;

  @IsIn(SHIFT_SLOTS)
  slot: (typeof SHIFT_SLOTS)[number];

  @IsUUID()
  @IsOptional()
  assignedCaregiverId: string | null;

  @IsUUID()
  changedBy: string;
}
