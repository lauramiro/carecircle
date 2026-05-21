import { useState } from 'react';
import { inviteMember } from '../../api/groups/groups.service';

interface UseInviteMemberResult {
  inviting: boolean;
  sendInvite: (email: string) => Promise<void>;
}

export function useInviteMember(groupId: string, groupName: string): UseInviteMemberResult {
  const [inviting, setInviting] = useState(false);

  async function sendInvite(email: string) {
    setInviting(true);
    try {
      await inviteMember({ groupId, email, groupName });
    } finally {
      setInviting(false);
    }
  }

  return { inviting, sendInvite };
}
