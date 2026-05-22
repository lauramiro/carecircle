import { useLocation, useParams } from 'react-router-dom';
import { AiQaInterface } from '@components/ai';

export default function AiQaPage() {
  const location = useLocation();
  const { groupId } = useParams<{ groupId: string }>();
  
  // First try to get patientId from navigation state
  //const groupId = location.state?.groupId;
  
  
  
  if (!groupId) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Patient not found</h2>
        <p>No patient ID provided. Please go back and try again.</p>
        <a href={`/groups/${groupId}`}>← Back to Group</a>
      </div>
    );
  }
  
  return (
    <div>
      <header style={{ padding: '16px', borderBottom: '1px solid #ddd' }}>
        <a href={`/groups/${groupId}`}>← Back to Group</a>
      </header>
      <AiQaInterface groupId={groupId} />
    </div>
  );
}