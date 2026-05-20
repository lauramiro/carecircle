/**
 * CC-109: Care Profile System Prompt Template
 * Injects full care profile context into every LLM call.
 * Profile is re-fetched on each request — never cached across sessions.
 */

export interface CareProfileContext {
  patientName: string;
  dateOfBirth: string;
  conditions: string[];
  allergies: string[];
  medications: MedicationContext[];
  recentLogs: MedicationLogContext[];
  recentJournalEntries: JournalContext[];
  upcomingAppointments: AppointmentContext[];
}

export interface MedicationContext {
  name: string;
  dose: string;
  dosage_unit: string;
  frequency: string;
  startDate: string;
}

export interface MedicationLogContext {
  medicationName: string;
  status: 'given' | 'skipped' | 'overdue';
  loggedAt: string;
  notes?: string;
}

export interface JournalContext {
  date: string;
  entry: string;
}

export interface AppointmentContext {
  title: string;
  date: string;
  location?: string;
  provider?: string;
}

/**
 * Builds the system prompt with injected care profile.
 * CC-110: Includes grounding rules and medical disclaimer.
 */
export function buildSystemPrompt(profile: CareProfileContext): string {
  const medications = profile.medications.length > 0
    ? profile.medications.map(m =>
        `- ${m.name} ${m.dose}${m.dosage_unit}, ${m.frequency} (started ${m.startDate})`
      ).join('\n')
    : 'No medications recorded.';

  const conditions = profile.conditions.length > 0
    ? profile.conditions.join(', ')
    : 'None recorded.';

  const allergies = profile.allergies.length > 0
    ? profile.allergies.join(', ')
    : 'None recorded.';

  const recentLogs = profile.recentLogs.length > 0
    ? profile.recentLogs.map(l =>
        `- ${l.medicationName}: ${l.status} on ${l.loggedAt}${l.notes ? ` (${l.notes})` : ''}`
      ).join('\n')
    : 'No recent medication logs.';

  const journalEntries = profile.recentJournalEntries.length > 0
    ? profile.recentJournalEntries.map(j =>
        `- ${j.date}: ${j.entry}`
      ).join('\n')
    : 'No recent journal entries.';

  const appointments = profile.upcomingAppointments.length > 0
    ? profile.upcomingAppointments.map(a =>
        `- ${a.title} on ${a.date}${a.location ? ` at ${a.location}` : ''}${a.provider ? ` with ${a.provider}` : ''}`
      ).join('\n')
    : 'No upcoming appointments.';

  return `
You are a care coordination assistant for CareCircle. You help family caregivers understand and manage care for their loved ones.

## GROUNDING RULES (CC-110)
- Base ALL responses exclusively on the care profile provided below.
- NEVER invent medications, conditions, dosages, dates, or appointments.
- If a question requires information NOT present in the profile, respond with: "This information is not in the care profile."
- Do NOT extrapolate or make assumptions beyond what is explicitly stated.
- Do NOT provide general medical advice beyond what is in the profile.

## CARE PROFILE FOR: ${profile.patientName}
Date of Birth: ${profile.dateOfBirth}

### Current Medications
${medications}

### Conditions
${conditions}

### Allergies
${allergies}

### Medication Logs (Last 7 Days)
${recentLogs}

### Journal Entries (Last 7 Days)
${journalEntries}

### Upcoming Appointments (Next 3)
${appointments}

## RESPONSE FORMAT
- Always cite the specific profile data you used: "Based on: [data source]"
- Always end every response with this disclaimer:
  "This information is based on the recorded care profile and is not medical advice. Always consult a qualified healthcare professional."
- Keep responses concise and focused on the question asked.
`.trim();
}