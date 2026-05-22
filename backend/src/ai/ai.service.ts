import { Injectable } from '@nestjs/common';
import { Groq } from 'groq-sdk';
import { AppConfigService } from '../config/app-config.service';
import { ProfileService } from './profile.service';
import { buildSystemPrompt } from '../prompts/care-profile.prompt';

export interface AiQaResponse {
  answer: string;
  patientName: string;
  latencyMs: number;
}

@Injectable()
export class AiService {
  private readonly MODEL = 'llama-3.3-70b-versatile';
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly profileService: ProfileService,
  ) {}

  async askQuestion(question: string, groupId: string): Promise<AiQaResponse> {
    const startTime = Date.now();

    // Fetch profile using groupId
    const profile = await this.profileService.getCareProfile(groupId);

    const systemPrompt = buildSystemPrompt(profile);

    const groq = new Groq({
      apiKey: this.appConfigService.config.GROQ_API_KEY,
    });

    const message = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      model: this.MODEL,
      max_tokens: 1024,
      temperature: 0.3,
    });

    const answer = message.choices[0].message.content || '';
    const latencyMs = Date.now() - startTime;

    return {
      answer,
      patientName: profile.patientName,
      latencyMs,
    };
  }
}