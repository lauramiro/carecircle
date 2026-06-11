import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PatientRepository } from '../integrations/repositories/patient.repository';
import type { CareProfileContext, WellbeingCheckinContext } from '../prompts/care-profile.prompt';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private readonly patientRepo: PatientRepository) {}

  async getCareProfile(groupId: string): Promise<CareProfileContext> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    const patient = await this.patientRepo.findByGroupId(groupId);
    if (!patient) {
      this.logger.error(`Patient not found for group ${groupId}`);
      throw new NotFoundException(`Patient not found for group ${groupId}`);
    }

    const patientId = patient.id as string;

    const [medications, logs, journal, appointments, wellbeingCheckins] = await Promise.all([
      this.patientRepo.findActiveMedications(patientId),
      this.patientRepo.findRecentMedicationLogs(patientId, sevenDaysAgoStr),
      this.patientRepo.findRecentJournalEntries(groupId, sevenDaysAgoStr),
      this.patientRepo.findUpcomingAppointments(patientId),
      this.patientRepo.findRecentWellbeingCheckins(patientId, sevenDaysAgoStr),
    ]);

    return {
      patientName: patient.full_name as string,
      dateOfBirth: patient.date_of_birth as string,
      conditions: (patient.chronic_conditions as string[]) ?? [],
      allergies: (patient.allergies as string[]) ?? [],
      medications: medications.map((m: Record<string, unknown>) => {
        const frequency =
          m.schedule_type === 'interval' && m.interval_hours
            ? `every ${m.interval_hours} hours`
            : ((m.schedule_type as string) ?? 'unspecified');
        return {
          name: m.medication_name as string,
          dose: String(m.dose),
          dosage_unit: (m.dosage_unit as string) ?? 'mg',
          frequency,
          startDate: m.start_date as string,
        };
      }),
      recentLogs: logs.map((l: Record<string, unknown>) => ({
        medicationName:
          (l.medications as { medication_name?: string } | null)
            ?.medication_name ?? 'Unknown',
        status: l.status as 'given' | 'skipped' | 'overdue',
        loggedAt: (l.actual_time as string) ?? (l.scheduled_time as string),
        notes: (l.notes as string | null) ?? undefined,
      })),
      recentJournalEntries: journal.map((j: Record<string, unknown>) => ({
        date: j.created_at as string,
        entry: j.content as string,
      })),
      upcomingAppointments: appointments.map((a: Record<string, unknown>) => ({
        title: a.title as string,
        date: a.start_time as string,
        location: (a.location as string | null) ?? undefined,
        provider: (a.provider_name as string | null) ?? undefined,
      })),
      recentWellbeingCheckins: (wellbeingCheckins as Record<string, unknown>[]).map(
        (c): WellbeingCheckinContext => ({
          checkinDate: c.checkin_date as string,
          mood: c.mood as number,
          appetite: c.appetite as WellbeingCheckinContext['appetite'],
          mobility: c.mobility as WellbeingCheckinContext['mobility'],
          painLevel: c.pain_level as number,
          notes: (c.notes as string | null) ?? undefined,
        }),
      ),
    };
  }
}
