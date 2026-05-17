import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class PushDispatchedDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  checklistItemId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  groupId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  medicationName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  doseSummary!: string;

  @IsInt()
  @Min(0)
  @Max(24 * 60)
  minutesOverdue!: number;
}
