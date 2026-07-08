import { IsUUID } from 'class-validator';

export class GroupIdBodyDto {
  @IsUUID()
  groupId!: string;
}

export class DismissInsightDto {
  @IsUUID()
  userId!: string;
}
