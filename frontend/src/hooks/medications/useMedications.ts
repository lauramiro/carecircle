import { useEffect, useState } from 'react';
import type { AddMedicationPayload, EditMedicationPayload, Medication } from '../../api/medications/medications.types';
import {
  addMedication as addMedicationService,
  editMedication as editMedicationService,
  pauseMedication as pauseMedicationService,
  activateMedication as activateMedicationService,
  archiveMedication as archiveMedicationService,
  getMedicationsByPatient,
} from '../../api/medications/medications.mock';

export function useMedications(patientId: string) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await Promise.resolve();
      setLoading(true);
      setError(null);
      try {
        const data = await getMedicationsByPatient(patientId);
        if (!cancelled) setMedications(data);
      } catch {
        if (!cancelled) setError('Failed to load medications.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  async function addMedication(payload: AddMedicationPayload): Promise<void> {
    setIsSubmitting(true);
    try {
      const created = await addMedicationService(payload);
      setMedications((current) => [...current, created]);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function editMedication(id: string, changes: EditMedicationPayload): Promise<void> {
    setIsSubmitting(true);
    try {
      const next = await editMedicationService(id, changes);
      setMedications((current) =>
        current.map((m) => (m.id === id ? next : m)),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function pauseMedication(id: string): Promise<void> {
    setIsSubmitting(true);
    try {
      const updated = await pauseMedicationService(id);
      setMedications((current) =>
        current.map((m) => (m.id === updated.id ? updated : m)),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function activateMedication(id: string): Promise<void> {
    setIsSubmitting(true);
    try {
      const updated = await activateMedicationService(id);
      setMedications((current) =>
        current.map((m) => (m.id === updated.id ? updated : m)),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function archiveMedication(id: string): Promise<void> {
    setIsSubmitting(true);
    try {
      const updated = await archiveMedicationService(id);
      setMedications((current) =>
        current.map((m) => (m.id === updated.id ? updated : m)),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return { medications, loading, error, isSubmitting, addMedication, editMedication, pauseMedication, activateMedication, archiveMedication };
}
