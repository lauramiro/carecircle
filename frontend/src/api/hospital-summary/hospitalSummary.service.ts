import axios from 'axios';
import { apiUrl } from '@lib/apiBaseUrl';
import { authenticatedFetch, getAccessToken } from '@lib/authenticatedFetch';

export async function assembleHospitalSummary(groupId: string) {
  const response = await authenticatedFetch('/api/hospital-summary/assemble', {
    method: 'POST',
    body: JSON.stringify({ groupId }),
  });
  if (!response.ok) {
    throw new Error('Failed to assemble hospital summary');
  }
  return response.json();
}

export async function generateHospitalSummaryPDF(groupId: string) {
  const token = await getAccessToken();
  const res = await axios.post(
    apiUrl('/api/hospital-summary/generate-pdf'),
    { groupId },
    {
      responseType: 'blob',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );
  return res.data as Blob;
}

export async function fetchInsights(
  groupId: string,
): Promise<Record<string, unknown>[]> {
  const response = await authenticatedFetch(
    `/api/insights/group/${encodeURIComponent(groupId)}`,
  );
  if (!response.ok) {
    throw new Error('Failed to fetch insights');
  }
  const data = (await response.json()) as { insights?: Record<string, unknown>[] };
  return data.insights ?? [];
}
