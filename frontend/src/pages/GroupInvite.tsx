import { Navigate, useParams } from 'react-router-dom';
import GroupPage from './GroupPage';

export default function GroupInvite() {
  const { groupId } = useParams<{ groupId: string }>();

  if (!groupId) {
    return <Navigate to="/signup" replace />;
  }

  return <GroupPage groupId={groupId} />;
}
