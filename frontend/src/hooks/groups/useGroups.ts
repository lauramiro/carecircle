import { useEffect, useState } from 'react';
import { getGroups } from '../../api/groups/groups.service';
import type { GroupSummary } from '../../api/groups/groups.types';

interface UseGroupsResult {
  groups: GroupSummary[];
  loading: boolean;
  error: string | null;
}

export function useGroups(): UseGroupsResult {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadGroups() {
      try {
        setLoading(true);
        setError(null);
        const result = await getGroups();
        if (active) setGroups(result);
      } catch {
        if (active) setError('Unable to load groups. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadGroups();

    return () => {
      active = false;
    };
  }, []);

  return { groups, loading, error };
}
