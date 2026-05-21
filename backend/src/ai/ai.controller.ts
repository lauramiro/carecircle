import { Body, Controller, Post } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { Groq } from 'groq-sdk';
import { AiService } from './ai.service';
import { AppConfigService } from '../config/app-config.service';
import { buildSystemPrompt } from '../prompts/care-profile.prompt';

export class AskQuestionDto {
  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsString()
  @IsNotEmpty()
  patientId!: string;
}

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly appConfigService: AppConfigService,
  ) {}

  // CC-109: Production endpoint (when I have real patient IDs)
  //@Post('qa')
  //async ask(@Body() dto: AskQuestionDto) {
    //return this.aiService.askQuestion(dto.question, dto.patientId);
  //}

  // CC-109: Test endpoint (with mock profile data - no patient ID needed)
  @Post('qa/test')
  async askTest(@Body() dto: AskQuestionDto) {
    const startTime = Date.now();

    // Mock care profile for testing
    const mockProfile = {
      patientName: 'Jane Doe',
      dateOfBirth: '1945-03-15',
      conditions: ['Type 2 Diabetes', 'Hypertension'],
      allergies: ['Penicillin', 'Aspirin'],
      medications: [
        { 
          name: 'Metformin', 
          dose: '500', 
          dosage_unit: 'mg', 
          frequency: 'twice daily', 
          startDate: '2024-01-10' 
        },
        { 
          name: 'Lisinopril', 
          dose: '10', 
          dosage_unit: 'mg', 
          frequency: 'once daily', 
          startDate: '2023-06-01' 
        },
      ],
      recentLogs: [
        { 
          medicationName: 'Metformin', 
          status: 'given' as const, 
          loggedAt: '2026-05-18T08:00:00Z' 
        },
        { 
          medicationName: 'Lisinopril', 
          status: 'skipped' as const, 
          loggedAt: '2026-05-17T09:00:00Z', 
          notes: 'Patient refused' 
        },
      ],
      recentJournalEntries: [
        { 
          date: '2026-05-17', 
          entry: 'Patient complained of dizziness in the morning.' 
        },
      ],
      upcomingAppointments: [
        { 
          title: 'Cardiology Check-up', 
          date: '2026-05-25T10:00:00Z', 
          location: 'City Hospital', 
          provider: 'Dr. Smith' 
        },
      ],
    };

    // Step 1: Build system prompt with mock profile (CC-110 grounding rules)
    const systemPrompt = buildSystemPrompt(mockProfile);

    // Step 2: Initialize Groq client
    const groq = new Groq({
      apiKey: this.appConfigService.config.GROQ_API_KEY,
    });

    // Step 3: Call Llama via Groq
    const message = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: dto.question },
      ],
      model: 'llama-3.3-70b-versatile', 
      max_tokens: 1024,
      temperature: 0.3, 
    });

    // Step 4: Extract response
    const answer = message.choices[0].message.content || '';
    const latencyMs = Date.now() - startTime;

    // Step 5: Return response back to frontend (CC-111)
    return {
      answer,
      patientName: mockProfile.patientName,
      latencyMs,
    };
  }
}