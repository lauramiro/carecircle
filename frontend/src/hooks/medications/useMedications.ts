import { useCallback, useEffect, useState } from 'react';
import type { AddMedicationPayload, Medication } from '../../api/medications/medications.types';
import {
  addMedication as addMedicationService,
  getMedicationsByPatient,
} from '../../api/medications/medications.service';

export function useMedications(patientId: string) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMedicationsByPatient(patientId);
      setMedications(data);
    } catch {
      setError('Failed to load medications.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addMedication(payload: AddMedicationPayload): Promise<void> {
    setIsSubmitting(true);
    try {
      const created = await addMedicationService(payload);
      setMedications((current) => [...current, created]);
    } finally {
      setIsSubmitting(false);
    }
  }

  return { medications, loading, error, isSubmitting, addMedication };
}
