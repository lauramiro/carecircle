import { useEffect, useState } from 'react';
import { getUserGroupDetails } from '../../api/groups/groups.service';
import type { Group } from '../../api/groups/groups.types';

interface UseGroupDetailResult {
  group: Group | null;
  loading: boolean;
  error: string | null;
}

export function useGroupDetail(groupId: string | undefined): UseGroupDetailResult {
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadGroup() {
      if (!groupId) {
        setGroup(null);
        setError('Group ID is missing.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const result = await getUserGroupDetails(groupId);
        if (!active) return;

        setGroup(result);
        setError(result ? null : 'Group not found.');
      } catch {
        if (active) setError('Unable to load group details. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadGroup();

    return () => {
      active = false;
    };
  }, [groupId]);

  return { group, loading, error };
}
