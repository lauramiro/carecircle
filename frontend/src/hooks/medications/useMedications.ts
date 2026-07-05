import { useEffect, useState } from 'react';
import type { AddMedicationPayload, EditMedicationPayload, Medication } from '../../api/medications/medications.types';
import {
  addMedication as addMedicationService,
  editMedication as editMedicationService,
  pauseMedication as pauseMedicationService,
  activateMedication as activateMedicationService,
  archiveMedication as archiveMedicationService,
  getMedicationsByPatient,
} from '../../api/medications/medications.service';

type SubmittingAction = 'add' | 'edit' | 'pause' | 'activate' | 'archive' | null;

export function useMedications(patientId: string, groupId: string) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState<SubmittingAction>(null);
  const [submittingMedicationId, setSubmittingMedicationId] = useState<string | null>(null);

  const isSubmitting = submittingAction !== null;
  const isFormSubmitting = submittingAction === 'add' || submittingAction === 'edit';

  useEffect(() => {
    if (!patientId) {
      setMedications([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      if (!patientId) {
        setMedications([]);
        setLoading(false);
        setError(null);
        return;
      }

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
    setSubmittingAction('add');
    try {
      const created = await addMedicationService(groupId, payload);
      setMedications((current) => [...current, created]);
    } finally {
      setSubmittingAction(null);
    }
  }

  async function editMedication(id: string, changes: EditMedicationPayload): Promise<void> {
    setSubmittingAction('edit');
    try {
      const next = await editMedicationService(groupId, id, changes);
      setMedications((current) =>
        current.map((m) => (m.id === id ? next : m)),
      );
    } finally {
      setSubmittingAction(null);
    }
  }

  async function pauseMedication(id: string): Promise<void> {
    setSubmittingAction('pause');
    setSubmittingMedicationId(id);
    try {
      const updated = await pauseMedicationService(groupId, id);
      setMedications((current) =>
        current.map((m) => (m.id === updated.id ? updated : m)),
      );
    } finally {
      setSubmittingAction(null);
      setSubmittingMedicationId(null);
    }
  }

  async function activateMedication(id: string): Promise<void> {
    setSubmittingAction('activate');
    setSubmittingMedicationId(id);
    try {
      const updated = await activateMedicationService(groupId, id);
      setMedications((current) =>
        current.map((m) => (m.id === updated.id ? updated : m)),
      );
    } finally {
      setSubmittingAction(null);
      setSubmittingMedicationId(null);
    }
  }

  async function archiveMedication(id: string): Promise<void> {
    setSubmittingAction('archive');
    setSubmittingMedicationId(id);
    try {
      const updated = await archiveMedicationService(groupId, id);
      setMedications((current) =>
        current.map((m) => (m.id === updated.id ? updated : m)),
      );
    } finally {
      setSubmittingAction(null);
      setSubmittingMedicationId(null);
    }
  }

  return {
    medications,
    loading,
    error,
    isSubmitting,
    isFormSubmitting,
    submittingMedicationId,
    addMedication,
    editMedication,
    pauseMedication,
    activateMedication,
    archiveMedication,
  };
}
