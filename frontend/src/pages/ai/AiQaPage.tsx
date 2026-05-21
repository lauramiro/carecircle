import { useParams } from 'react-router-dom';
import { AiQaInterface } from '@components/ai';

export default function AiQaPage() {
  const { patientId } = useParams<{ patientId: string }>();
  
  if (!patientId) return <div>Patient not found</div>;
  
  return (
    <div>
      <header style={{ padding: '16px', borderBottom: '1px solid #ddd' }}>
        <a href={`/care/${patientId}`}>← Back</a>
      </header>
      <AiQaInterface patientId={patientId} />
    </div>
  );
}
