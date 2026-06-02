export type InsightSeverity = 'low' | 'medium' | 'high';

export type InsightType =
  | 'pain_trend'
  | 'medication_adherence'
  | 'appetite_change'
  | 'journalling_gap'
  | 'shift_imbalance';

export interface AiInsight {
  id: string;
  insightType: InsightType;
  observation: string;
  //suggestedAction: string;
  severity: InsightSeverity;
  //generatedAt: string;
}
