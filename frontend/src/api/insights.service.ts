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

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export async function getLatestInsights(groupId: string, userId: string): Promise<{ digest: WeeklyDigest | null; cards: InsightCard[] }> {
  const response = await fetch(`${apiBaseUrl}/api/insights/${groupId}/latest?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch latest insights');
  return response.json() as Promise<{ digest: WeeklyDigest | null; cards: InsightCard[] }>;
}

export async function getArchivedDigests(groupId: string): Promise<WeeklyDigest[]> {
  const response = await fetch(`${apiBaseUrl}/api/insights/${groupId}/archive`);
  if (!response.ok) throw new Error('Failed to fetch archived digests');
  return response.json() as Promise<WeeklyDigest[]>;
}

export async function dismissInsight(cardId: string, userId: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/insights/cards/${cardId}/dismiss`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) throw new Error('Failed to dismiss insight');
}

export async function triggerInsightGeneration(groupId: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/insights/debug/generate/${groupId}`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to trigger insight generation');
}

