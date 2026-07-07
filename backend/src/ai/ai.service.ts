import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Groq } from 'groq-sdk';
import { AppConfigService } from '../config/app-config.service';
import { ProfileService } from './profile.service';
import {
  buildSystemPrompt,
  CareProfileContext,
} from '../prompts/care-profile.prompt';

export interface AiQaResponse {
  answer: string;
  patientName: string;
  latencyMs: number;
}

export interface InsightCardPayload {
  type: string;
  title: string;
  description: string;
  trend_direction?: string;
  data_link?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly MODEL = 'llama-3.3-70b-versatile';
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly profileService: ProfileService,
  ) {}

  async askQuestion(question: string, groupId: string): Promise<AiQaResponse> {
    const startTime = Date.now();

    // Fetch profile using groupId (handle not-found gracefully)
    let profile: CareProfileContext;
    try {
      profile = await this.profileService.getCareProfile(groupId);
    } catch (err: unknown) {
      if (
        err instanceof NotFoundException ||
        (err as { status?: number })?.status === 404
      ) {
        this.logger.warn(`No patient profile for groupId=${groupId}`);
        throw new NotFoundException(
          'Patient record not found. Please verify the provided groupId.',
        );
      }
      throw err;
    }

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

  async generateInsights(prompt: string): Promise<InsightCardPayload[]> {
    const groq = new Groq({
      apiKey: this.appConfigService.config.GROQ_API_KEY,
    });

    const message = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a care coordination assistant. Return ONLY JSON.',
        },
        { role: 'user', content: prompt },
      ],
      model: this.MODEL,
      max_tokens: 1024,
      temperature: 0.1, // Lower temperature for more consistent JSON
      response_format: { type: 'json_object' },
    });

    const content = message.choices[0].message.content || '[]';
    try {
      const parsed = JSON.parse(content) as unknown;
      if (Array.isArray(parsed)) return parsed as InsightCardPayload[];
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        Array.isArray((parsed as { insights?: unknown[] }).insights)
      ) {
        return (parsed as { insights?: InsightCardPayload[] }).insights ?? [];
      }
      return [];
    } catch {
      this.logger.error(`Failed to parse AI insights JSON: ${content}`);
      return [];
    }
  }
}
