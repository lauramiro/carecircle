export interface WeeklyDigestContext {
  patientName: string;
  startDate: string;
  endDate: string;
  medicationLogs: {
    medicationName: string;
    status: string;
    loggedAt: string;
    notes?: string;
  }[];
  journalEntries: {
    date: string;
    entry: string;
  }[];
  vitalSigns: {
    measuredAt: string;
    bloodGlucose?: number;
    bpSystolic?: number;
    bpDiastolic?: number;
    heartRate?: number;
    notes?: string;
  }[];
}

export function buildWeeklyDigestPrompt(context: WeeklyDigestContext): string {
  return `
You are an expert care coordination AI for CareCircle.
Your task is to analyze the last 7 days of care data for ${context.patientName} and generate 3-5 concise, data-backed insight cards for the family.

## Data for the week of ${context.startDate} to ${context.endDate}

### Medication Adherence
${context.medicationLogs.length > 0 
  ? context.medicationLogs.map(l => `- ${l.loggedAt}: ${l.medicationName} was ${l.status}${l.notes ? ` (${l.notes})` : ''}`).join('\n')
  : 'No medication logs recorded this week.'}

### Care Journal
${context.journalEntries.length > 0
  ? context.journalEntries.map(j => `- ${j.date}: ${j.entry}`).join('\n')
  : 'No journal entries recorded this week.'}

### Vital Signs
${context.vitalSigns.length > 0
  ? context.vitalSigns.map(v => `- ${v.measuredAt}: BG: ${v.bloodGlucose ?? 'N/A'}, BP: ${v.bpSystolic ?? 'N/A'}/${v.bpDiastolic ?? 'N/A'}, HR: ${v.heartRate ?? 'N/A'}${v.notes ? ` (${v.notes})` : ''}`).join('\n')
  : 'No vital signs recorded this week.'}

## Instructions
1. Generate 3-5 insight cards.
2. Each card must have:
   - title: Short, engaging title (e.g., "Medication Streak!", "Pain levels increasing")
   - description: 1-2 sentences explaining the insight based on the data.
   - type: One of 'medication_adherence', 'pain_trend', 'vital_signs', 'journal_summary'.
   - trend_direction: 'up', 'down', 'stable', or null.
   - data_link: The path to the relevant data in the app.
     - Use '/groups/:groupId/administration-log' for medication_adherence.
     - Use '/groups/:groupId/journal' for pain_trend or journal_summary.
     - Use '/groups/:groupId/profile' for vital_signs.
3. If data shows a clear trend (e.g. fewer "pain" mentions in journal, or improving vital signs), note it.
4. Be empathetic but objective.

## Output Format
Return ONLY a JSON array of objects with the following structure:
[
  {
    "title": "string",
    "description": "string",
    "type": "string",
    "trend_direction": "string | null",
    "data_link": "string"
  }
]
`.trim();
}
