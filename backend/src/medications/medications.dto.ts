import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateMedicationDto {
  @IsUUID()
  patientId!: string;

  @IsString()
  @IsNotEmpty()
  medicationName!: string;

  @IsNumber()
  @Min(0.01)
  dose!: number;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsString()
  startDate!: string;

  @IsIn(['daily', 'weekly', 'biweekly', 'monthly', 'as_needed'])
  scheduleType!: string;

  @IsOptional()
  @IsArray()
  specificTimes?: string[];

  @IsOptional()
  @IsInt()
  intervalHours?: number;

  @IsOptional()
  @IsArray()
  daysOfWeek?: number[];

  @IsOptional()
  @IsInt()
  dayOfMonth?: number;

  @ValidateIf((o) => o.scheduleType !== 'as_needed')
  @IsBoolean()
  perpetual!: boolean;

  @ValidateIf((o) => o.scheduleType !== 'as_needed' && !o.perpetual)
  @IsOptional()
  @IsString()
  endDate?: string;

  @ValidateIf(
    (o) => o.scheduleType !== 'as_needed' && !o.perpetual && !o.endDate,
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  totalDoses?: number;

  @IsOptional()
  @IsString()
  form?: string;

  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  takeWithFood?: boolean;
}

export class UpdateMedicationDto {
  @IsOptional()
  @IsString()
  medicationName?: string;

  @IsOptional()
  @IsNumber()
  dose?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsIn(['daily', 'weekly', 'biweekly', 'monthly', 'as_needed'])
  scheduleType?: string;

  @IsOptional()
  @IsArray()
  specificTimes?: string[] | null;

  @IsOptional()
  @IsInt()
  intervalHours?: number | null;

  @IsOptional()
  @IsArray()
  daysOfWeek?: number[] | null;

  @IsOptional()
  @IsInt()
  dayOfMonth?: number | null;

  @IsOptional()
  @IsBoolean()
  perpetual?: boolean;

  @IsOptional()
  @IsString()
  endDate?: string | null;

  @IsOptional()
  @IsInt()
  totalDoses?: number | null;
}
