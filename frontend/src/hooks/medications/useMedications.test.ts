import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddMedicationPayload, Medication } from '../../api/medications/medications.types';
import { useMedications } from './useMedications';

vi.mock('../../api/medications/medications.service', () => ({
  getMedicationsByPatient: vi.fn(),
  addMedication: vi.fn(),
  editMedication: vi.fn(),
  pauseMedication: vi.fn(),
  activateMedication: vi.fn(),
  archiveMedication: vi.fn(),
}));

import {
  getMedicationsByPatient,
  addMedication as addMedicationService,
  editMedication as editMedicationService,
  pauseMedication as pauseMedicationService,
  activateMedication as activateMedicationService,
  archiveMedication as archiveMedicationService,
} from '../../api/medications/medications.service';

const mockGetMedications = vi.mocked(getMedicationsByPatient);
const mockAdd = vi.mocked(addMedicationService);
const mockEdit = vi.mocked(editMedicationService);
const mockPause = vi.mocked(pauseMedicationService);
const mockActivate = vi.mocked(activateMedicationService);
const mockArchive = vi.mocked(archiveMedicationService);

function makeMed(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'med-1',
    patientId: 'patient-1',
    medicationName: 'Aspirin',
    genericName: null,
    dosage: '100 mg',
    form: null,
    prescribedBy: null,
    prescribedDate: null,
    prescriptionNumber: null,
    scheduleType: 'daily',
    specificTimes: ['08:00'],
    intervalHours: null,
    daysOfWeek: null,
    dayOfMonth: null,
    instructions: null,
    route: null,
    takeWithFood: null,
    quantityOnHand: null,
    lowStockAlertThresholdDays: 7,
    lowStockAlertSentAt: null,
    startDate: '2025-01-01',
    endDate: null,
    status: 'active',
    discontinuedDate: null,
    discontinuedReason: null,
    refillsRemaining: null,
    lastRefillDate: null,
    pharmacy: null,
    pharmacyPhone: null,
    sideEffects: null,
    notes: null,
    version: 1,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const BASE_PAYLOAD: AddMedicationPayload = {
  patientId: 'patient-1',
  medicationName: 'Aspirin',
  dosage: '100 mg',
  scheduleType: 'daily',
  specificTimes: ['08:00'],
  startDate: '2025-01-01',
};

describe('useMedications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMedications.mockResolvedValue([]);
  });

  it('does not fetch when patientId is empty', async () => {
    const { result } = renderHook(() => useMedications('', 'group-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetMedications).not.toHaveBeenCalled();
    expect(result.current.medications).toEqual([]);
  });

  it('loads medications on mount and clears loading state', async () => {
    const med = makeMed();
    mockGetMedications.mockResolvedValue([med]);

    const { result } = renderHook(() => useMedications('patient-1', 'group-1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.medications).toEqual([med]);
    expect(result.current.error).toBeNull();
  });

  it('sets error message when load fails', async () => {
    mockGetMedications.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useMedications('patient-1', 'group-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load medications.');
    expect(result.current.medications).toEqual([]);
  });

  it('returns an empty medications array when the patient has no medications', async () => {
    mockGetMedications.mockResolvedValue([]);

    const { result } = renderHook(() => useMedications('patient-1', 'group-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.medications).toEqual([]);
  });

  it('appends the new medication to the list after addMedication', async () => {
    const existing = makeMed({ id: 'med-1' });
    const created = makeMed({ id: 'med-2', medicationName: 'Ibuprofen' });
    mockGetMedications.mockResolvedValue([existing]);
    mockAdd.mockResolvedValue(created);

    const { result } = renderHook(() => useMedications('patient-1', 'group-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addMedication(BASE_PAYLOAD);
    });

    expect(result.current.medications).toHaveLength(2);
    expect(result.current.medications[1].id).toBe('med-2');
  });

  it('sets isFormSubmitting only during addMedication', async () => {
    let resolveAdd!: (m: Medication) => void;
    mockAdd.mockReturnValue(new Promise<Medication>((res) => { resolveAdd = res; }));
    mockGetMedications.mockResolvedValue([]);

    const { result } = renderHook(() => useMedications('patient-1', 'group-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      void result.current.addMedication(BASE_PAYLOAD);
    });

    expect(result.current.isFormSubmitting).toBe(true);
    expect(result.current.isSubmitting).toBe(true);
    expect(result.current.submittingMedicationId).toBeNull();

    await act(async () => {
      resolveAdd(makeMed({ id: 'med-new' }));
    });

    expect(result.current.isFormSubmitting).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('does not set isFormSubmitting during pauseMedication', async () => {
    let resolvePause!: (m: Medication) => void;
    mockPause.mockReturnValue(new Promise<Medication>((res) => { resolvePause = res; }));
    mockGetMedications.mockResolvedValue([makeMed({ id: 'med-1', status: 'active' })]);

    const { result } = renderHook(() => useMedications('patient-1', 'group-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      void result.current.pauseMedication('med-1');
    });

    expect(result.current.isFormSubmitting).toBe(false);
    expect(result.current.isSubmitting).toBe(true);
    expect(result.current.submittingMedicationId).toBe('med-1');

    await act(async () => {
      resolvePause(makeMed({ id: 'med-1', status: 'paused' }));
    });

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.submittingMedicationId).toBeNull();
  });

  it('sets isSubmitting to true during addMedication and resets it after', async () => {
    let resolveAdd!: (m: Medication) => void;
    mockAdd.mockReturnValue(new Promise<Medication>((res) => { resolveAdd = res; }));
    mockGetMedications.mockResolvedValue([]);

    const { result } = renderHook(() => useMedications('patient-1', 'group-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      void result.current.addMedication(BASE_PAYLOAD);
    });

    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      resolveAdd(makeMed({ id: 'med-new' }));
    });

    expect(result.current.isSubmitting).toBe(false);
  });

  it('replaces the old medication entry with the new version after editMedication', async () => {
    const v1 = makeMed({ id: 'med-v1', version: 1 });
    const v2 = makeMed({ id: 'med-v2', version: 2, dosage: '200 mg' });
    mockGetMedications.mockResolvedValue([v1]);
    mockEdit.mockResolvedValue(v2);

    const { result } = renderHook(() => useMedications('patient-1', 'group-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.editMedication('med-v1', { dosage: '200 mg' });
    });

    expect(result.current.medications).toHaveLength(1);
    expect(result.current.medications[0].id).toBe('med-v2');
    expect(result.current.medications[0].version).toBe(2);
  });

  it('updates the medication status in-place after pauseMedication', async () => {
    const active = makeMed({ id: 'med-1', status: 'active' });
    const paused = makeMed({ id: 'med-1', status: 'paused' });
    mockGetMedications.mockResolvedValue([active]);
    mockPause.mockResolvedValue(paused);

    const { result } = renderHook(() => useMedications('patient-1', 'group-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.pauseMedication('med-1');
    });

    expect(result.current.medications[0].status).toBe('paused');
  });

  it('updates the medication status in-place after activateMedication', async () => {
    const paused = makeMed({ id: 'med-1', status: 'paused' });
    const active = makeMed({ id: 'med-1', status: 'active' });
    mockGetMedications.mockResolvedValue([paused]);
    mockActivate.mockResolvedValue(active);

    const { result } = renderHook(() => useMedications('patient-1', 'group-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.activateMedication('med-1');
    });

    expect(result.current.medications[0].status).toBe('active');
  });

  it('updates the medication status in-place after archiveMedication', async () => {
    const active = makeMed({ id: 'med-1', status: 'active' });
    const archived = makeMed({ id: 'med-1', status: 'archived' });
    mockGetMedications.mockResolvedValue([active]);
    mockArchive.mockResolvedValue(archived);

    const { result } = renderHook(() => useMedications('patient-1', 'group-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.archiveMedication('med-1');
    });

    expect(result.current.medications[0].status).toBe('archived');
  });
});
