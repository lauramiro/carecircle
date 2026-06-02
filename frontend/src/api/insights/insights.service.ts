import { supabase } from '../../lib/supabaseClient';
import type { AiInsight, InsightSeverity, InsightType } from './insights.types';

type InsightRow = {
  id: string;
  insight_type: string;
  observation: string;
  //suggested_action: string;
  severity: string;
  //generated_at: string;
};

function fromRow(row: InsightRow): AiInsight {
  return {
    id: row.id,
    insightType: row.insight_type as InsightType,
    observation: row.observation,
    //suggestedAction: row.suggested_action,
    severity: row.severity as InsightSeverity,
    //generatedAt: row.generated_at,
  };
}

export async function getLatestInsightForPatient(patientId: string): Promise<AiInsight | null> {
  const { data, error } = await supabase
    .from('ai_insights')
    .select('id, insight_type, observation,  severity, created_at')
    .eq('patient_id', patientId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return fromRow(data as unknown as InsightRow);
}
