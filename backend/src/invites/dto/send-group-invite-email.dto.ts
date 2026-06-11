import {
  IsEmail,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SendGroupInviteEmailDto {
  @IsUUID('4')
  inviteId!: string;

  @IsUUID('4')
  groupId!: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;

  /** Display name for the care circle; supplied by the client after invite creation. */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  groupName!: string;
}

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}
