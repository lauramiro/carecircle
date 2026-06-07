import { useState } from 'react';
import { assembleHospitalSummary, generateHospitalSummaryPDF, fetchInsights } from '../api/hospital-summary/hospitalSummary.service';

export default function HospitalSummaryPanel() {
  const [groupId, setGroupId] = useState('');
  const [summary, setSummary] = useState<any | null>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const onAssemble = async () => {
    if (!groupId) return alert('Enter group id');
    setLoading(true);
    try {
      const s = await assembleHospitalSummary(groupId);
      setSummary(s);
    } catch (err) {
      alert('Failed to assemble summary');
    } finally {
      setLoading(false);
    }
  };

  const onDownloadPdf = async () => {
    if (!groupId) return alert('Enter group id');
    setLoading(true);
    try {
      const blob = await generateHospitalSummaryPDF(groupId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hospital-summary-${groupId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download PDF');
    } finally {
      setLoading(false);
    }
  };

  const onFetchInsights = async () => {
    if (!groupId) return alert('Enter group id');
    setLoading(true);
    try {
      const data = await fetchInsights(groupId);
      setInsights(data);
    } catch (err) {
      alert('Failed to fetch insights');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Hospital Summary</h2>
      <div style={{ marginBottom: 8 }}>
        <input placeholder="group id" value={groupId} onChange={(e) => setGroupId(e.target.value)} style={{ width: 400 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={onAssemble} disabled={loading}>Assemble Summary</button>
        <button onClick={onDownloadPdf} disabled={loading}>Download PDF</button>
        <button onClick={onFetchInsights} disabled={loading}>Fetch Insights</button>
      </div>

      {summary && (
        <div style={{ border: '1px solid #ddd', padding: 12 }}>
          <h3>Summary for {summary.fullName || summary.full_name || summary.patientId}</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(summary, null, 2)}</pre>
        </div>
      )}

      {insights.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <h3>Insights</h3>
          <ul>
            {insights.map((ins, idx) => (
              <li key={idx}><strong>{ins.insight_type}</strong>: {ins.observation} ({ins.severity})</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
