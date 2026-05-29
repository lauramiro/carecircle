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
    ? profile.medications.map(m => {
        const doseStr = m.dosage_unit ? `${m.dose}${m.dosage_unit}` : m.dose;
        const date = new Date(m.startDate);
        const dateStr = date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
        return `- ${m.name}: ${doseStr}, ${m.frequency} (started ${dateStr})`;
      }).join('\n')
    : 'No medications recorded.';

  const conditions = profile.conditions.length > 0
    ? profile.conditions.map(c => `- ${c}`).join('\n')
    : 'No conditions recorded.';

  const allergies = profile.allergies.length > 0
    ? profile.allergies.map(a => `- ${a}`).join('\n')
    : 'No allergies recorded.';

  const recentLogs = profile.recentLogs.length > 0
    ? profile.recentLogs.map(l => {
        const date = new Date(l.loggedAt);
        const dateStr = date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
        return `- ${l.medicationName}: ${l.status} on ${dateStr}${l.notes ? ` (${l.notes})` : ''}`;
      }).join('\n')
    : 'No recent medication logs.';

  const journalEntries = profile.recentJournalEntries.length > 0
    ? profile.recentJournalEntries.map(j => {
        const date = new Date(j.date);
        const dateStr = date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
        return `- ${dateStr}: ${j.entry}`;
      }).join('\n')
    : 'No recent journal entries.';

  const appointments = profile.upcomingAppointments.length > 0
    ? profile.upcomingAppointments.map(a => {
        const date = new Date(a.date);
        const dateStr = date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        return `- ${a.title} on ${dateStr}${a.location ? ` at ${a.location}` : ''}${a.provider ? ` with ${a.provider}` : ''}`;
      }).join('\n')
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

## RESPONSE FORMAT GUIDELINES
When answering questions about medications, appointments, journal entries, or conditions:

1. **For Lists (medications, appointments, allergies, etc.):**
   - Use markdown bullet points (-)
   - One item per line
   - Include relevant details (dose, frequency, date)
   - Example:

   Current medications:
 - Metformin 500mg, twice daily (started Jan 10, 2024)
 - Lisinopril 10mg, once daily (started Jun 1, 2023)

2. **For Narratives (journal entries, general info):**
   - Write in clear, concise paragraphs
   - Use line breaks between paragraphs
   - Keep sentences short

3. **For All Responses:**
   - Keep the response concise and focused on the question
   - Use markdown formatting for readability
   - Always cite the specific profile data you used: "Based on: [data source]"
   - ALWAYS end with this disclaimer (on a new line):
     "This information is based on the recorded care profile and is not medical advice. Always consult a qualified healthcare professional."
   - Do NOT include response time, model name, or technical details in the response.
   - Keep responses concise and focused on the question asked.

Remember: Your responses should be strictly grounded in the provided care profile. Do NOT provide information that is not explicitly stated in the profile. If the profile does not contain the information needed to answer a question, respond with "This information is not in the care profile."
`.trim();
}