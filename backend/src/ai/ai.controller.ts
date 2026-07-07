import { Body, Controller, Headers, Logger, Post } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import {
  assertGroupMemberIfTokenPresent,
  extractBearerToken,
} from '../common/auth/group-membership.util';
import { SupabaseAdminClient } from '../integrations/supabase-admin.client';
import { AiService } from './ai.service';
import { AppConfigService } from '../config/app-config.service';

export class AskQuestionDto {
  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsString()
  @IsNotEmpty()
  groupId!: string;
}

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);
  constructor(
    private readonly aiService: AiService,
    private readonly appConfigService: AppConfigService,
    private readonly supabase: SupabaseAdminClient,
  ) {}

  @Post('qa')
  async ask(
    @Body() dto: AskQuestionDto,
    @Headers('authorization') authorizationHeader?: string,
  ) {
    this.logger.log(`askQuestion request received for groupId=${dto.groupId}`);
    await assertGroupMemberIfTokenPresent(
      this.supabase,
      dto.groupId,
      extractBearerToken(authorizationHeader),
    );
    return this.aiService.askQuestion(dto.question, dto.groupId);
  }
}
