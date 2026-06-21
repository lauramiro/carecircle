export interface WeeklyDigestPromptParams {
  patientName: string;
  startDate: string;
  endDate: string;
  medicationLogs: Array<{
    medicationName: string;
    status: 'given' | 'skipped' | 'overdue';
    loggedAt: string;
    notes?: string;
  }>;
  journalEntries: Array<{
    date: string;
    entry: string;
  }>;
  vitalSigns: Array<{
    measuredAt: string;
    bloodGlucose?: number;
    bpSystolic?: number;
    bpDiastolic?: number;
    heartRate?: number;
    notes?: string;
  }>;
}

export function buildWeeklyDigestPrompt(
  params: WeeklyDigestPromptParams,
): string {
  const medicationSummary = params.medicationLogs
    .map(
      (log) =>
        `- ${log.medicationName}: ${log.status} (${log.loggedAt})${log.notes ? ` [${log.notes}]` : ''}`,
    )
    .join('\n');

  const journalSummary = params.journalEntries
    .map((entry) => `- ${entry.date}: ${entry.entry}`)
    .join('\n');

  const vitalsSummary = params.vitalSigns
    .map((vital) => {
      const readings = [
        vital.bloodGlucose ? `Blood Glucose: ${vital.bloodGlucose}` : null,
        vital.bpSystolic && vital.bpDiastolic
          ? `BP: ${vital.bpSystolic}/${vital.bpDiastolic}`
          : null,
        vital.heartRate ? `Heart Rate: ${vital.heartRate}` : null,
      ]
        .filter(Boolean)
        .join(', ');
      return `- ${vital.measuredAt}: ${readings}${vital.notes ? ` [${vital.notes}]` : ''}`;
    })
    .join('\n');

  return `You are a healthcare insights analyst. Analyze the following weekly care data for ${params.patientName} (${params.startDate} to ${params.endDate}) and generate 3-5 insightful cards.

**Medication Adherence:**
${medicationSummary || 'No logs recorded'}

**Patient Journal Entries:**
${journalSummary || 'No entries recorded'}

**Vital Signs:**
${vitalsSummary || 'No vitals recorded'}

Generate insights as a JSON array with this structure:
[
  {
    "type": "medication_adherence" | "vital_trend" | "symptom_pattern" | "wellness_note",
    "title": "Brief title",
    "description": "2-3 sentence insight",
    "trend_direction": "up" | "down" | "stable",
    "data_link": "/groups/:groupId/checklist"
  }
]

Focus on actionable insights that help the care team understand patterns and trends. Only include insights backed by the data provided.`;
}
