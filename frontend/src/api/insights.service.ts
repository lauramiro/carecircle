import { apiUrl } from '@lib/apiBaseUrl';

export interface InsightCard {
  id: string;
  digest_id: string;
  type: string;
  title: string;
  description: string;
  trend_direction: string | null;
  data_link: string;
  created_at: string;
}

export interface WeeklyDigest {
  id: string;
  group_id: string;
  start_date: string;
  end_date: string;
  created_at: string;
  insight_cards?: InsightCard[];
}

export async function getLatestInsights(groupId: string, userId: string): Promise<{ digest: WeeklyDigest | null; cards: InsightCard[] }> {
  const response = await fetch(apiUrl(`/api/insights/${groupId}/latest?userId=${userId}`));
  if (!response.ok) throw new Error('Failed to fetch latest insights');
  return response.json();
}

export async function getArchivedDigests(groupId: string): Promise<WeeklyDigest[]> {
  const response = await fetch(apiUrl(`/api/insights/${groupId}/archive`));
  if (!response.ok) throw new Error('Failed to fetch archived digests');
  return response.json();
}

export async function dismissInsight(cardId: string, userId: string): Promise<void> {
  const response = await fetch(apiUrl(`/api/insights/cards/${cardId}/dismiss`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) throw new Error('Failed to dismiss insight');
}

export async function triggerInsightGeneration(groupId: string): Promise<void> {
  const response = await fetch(apiUrl(`/api/insights/debug/generate/${groupId}`), {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to trigger insight generation');
}
