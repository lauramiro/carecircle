import { IsOptional, IsString, Matches } from 'class-validator';

export class DevSmsTestBodyDto {
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'to must be E.164 (e.g. +447911123456)',
  })
  to?: string;
}
