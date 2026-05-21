import { useState } from 'react';
import { AiQaInterface } from '@components/ai';

const PATIENTS = [
  { id: 'jane-mock', name: 'Jane Doe' },
  { id: 'john-mock', name: 'John Smith' },
];

export default function AiQaTestPage() {
  const [patientId, setPatientId] = useState('jane-mock');

  return (
    <div>
      <div style={{ padding: '20px' }}>
        <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          {PATIENTS.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <AiQaInterface patientId={patientId} />
    </div>
  );
}