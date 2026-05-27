import axios from 'axios';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export async function assembleHospitalSummary(groupId: string) {
  const res = await axios.post(`${apiBaseUrl}/api/hospital-summary/assemble`, { groupId });
  return res.data;
}

export async function generateHospitalSummaryPDF(groupId: string) {
  const res = await axios.post(
    `${apiBaseUrl}/api/hospital-summary/generate-pdf`,
    { groupId },
    { responseType: 'blob' },
  );
  return res.data; // Blob
}

export async function fetchInsights(groupId: string) {
  const res = await axios.get(`${apiBaseUrl}/api/insights/group/${encodeURIComponent(groupId)}`);
  return res.data.insights ?? [];
}
