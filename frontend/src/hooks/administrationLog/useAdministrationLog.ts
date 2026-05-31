import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { fetchAdministrationLogEvents } from '../../api/administrationLog/administrationLog.service';
import type { AdministrationLogEvent } from '../../api/administrationLog/administrationLog.types';
import { useSupabaseRealtime } from '../realtime/useSupabaseRealtime';

interface UseAdministrationLogResult {
  events: AdministrationLogEvent[];
  loading: boolean;
  reload: () => Promise<void>;
}

export function useAdministrationLog(
  groupId: string | undefined,
  patientId: string | undefined,
): UseAdministrationLogResult {
  const [events, setEvents] = useState<AdministrationLogEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!groupId || !patientId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchAdministrationLogEvents(groupId, patientId, {
        includeProofThumbnails: true,
      });
      setEvents(data);
    } catch {
      toast.error('Could not load administration log.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [groupId, patientId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleRealtimeChange = useCallback(() => {
    if (!groupId || !patientId) return;
    void fetchAdministrationLogEvents(groupId, patientId, {
      includeProofThumbnails: true,
    })
      .then(setEvents)
      .catch(() => {
        /* keep stale data on background refresh failure */
      });
  }, [groupId, patientId]);

  useSupabaseRealtime({
    channelName: `admin-log-${patientId}`,
    table: 'medication_logs',
    filter: patientId ? `patient_id=eq.${patientId}` : undefined,
    enabled: Boolean(patientId),
    onInsert: handleRealtimeChange,
    onUpdate: handleRealtimeChange,
    onDelete: handleRealtimeChange,
  });

  return { events, loading, reload };
}
