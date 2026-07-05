import axios from 'axios';
import { apiUrl } from '@lib/apiBaseUrl';

export async function assembleHospitalSummary(groupId: string) {
  const res = await axios.post(apiUrl('/api/hospital-summary/assemble'), { groupId });
  return res.data;
}

export async function generateHospitalSummaryPDF(groupId: string) {
  const res = await axios.post(
    apiUrl('/api/hospital-summary/generate-pdf'),
    { groupId },
    { responseType: 'blob' },
  );
  return res.data; // Blob
}

export async function fetchInsights(groupId: string) {
  const res = await axios.get(apiUrl(`/api/insights/group/${encodeURIComponent(groupId)}`));
  return res.data.insights ?? [];
}
