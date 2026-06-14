import { Body, Controller, Post, Logger } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { AiService } from './ai.service';

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
  constructor(private readonly aiService: AiService) {}

  /**
   * Answers a care-team question using the live care profile for a group.
   *
   * The controller only validates the public request shape and logs the group
   * boundary; the service owns profile loading, prompt construction, and AI
   * provider interaction so model-specific concerns stay out of HTTP routing.
   *
   * @param dto Request body containing `question` and `groupId`.
   * @returns AI answer payload with patient name and latency metadata.
   * @throws NotFoundException when no patient profile is linked to the group.
   * @throws Error Propagates AI provider, configuration, or profile-loading errors.
   */
  @Post('qa')
  async ask(@Body() dto: AskQuestionDto) {
    this.logger.log(`askQuestion request received for groupId=${dto.groupId}`);
    return this.aiService.askQuestion(dto.question, dto.groupId);
  }
}
