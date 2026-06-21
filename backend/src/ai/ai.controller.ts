import { Body, Controller, Post, Logger } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
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
  ) {}

  // CC-109: Production endpoint (when I have real patient IDs)
  @Post('qa')
  async ask(@Body() dto: AskQuestionDto) {
    this.logger.log(`askQuestion request received for groupId=${dto.groupId}`);
    return this.aiService.askQuestion(dto.question, dto.groupId);
  }
}
