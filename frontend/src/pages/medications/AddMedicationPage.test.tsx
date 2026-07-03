import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddMedicationPayload, EditMedicationPayload, Medication } from '../../api/medications/medications.types';
import AddMedicationPage from './AddMedicationPage';

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const medicationsHookMock = vi.hoisted(() => ({
  medications: [] as Medication[],
  loading: false,
  error: null as string | null,
  isSubmitting: false,
  addMedication: vi.fn<(_: AddMedicationPayload) => Promise<void>>(),
  editMedication: vi.fn<(_: string, __: EditMedicationPayload) => Promise<void>>(),
  pauseMedication: vi.fn<(_: string) => Promise<void>>(),
  activateMedication: vi.fn<(_: string) => Promise<void>>(),
  archiveMedication: vi.fn<(_: string) => Promise<void>>(),
}));

const groupDetailMock = vi.hoisted(() => ({
  group: {
    id: 'group-1',
    name: 'Dad Care Circle',
    patientId: 'patient-1',
  },
  loading: false,
  error: null as string | null,
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

vi.mock('../../hooks/groups/useGroupDetail', () => ({
  useGroupDetail: () => groupDetailMock,
}));

vi.mock('../../hooks/medications/useMedications', () => ({
  useMedications: () => medicationsHookMock,
}));

vi.mock('../../utils/formatMedicationSchedule', () => ({
  formatMedicationSchedule: () => 'Daily',
}));

vi.mock('../../components/medications/MedicationDetailsModal', () => ({
  default: () => null,
}));

vi.mock('../../components/medications/AddMedicationForm', () => ({
  default: ({ onSubmit }: { onSubmit: (payload: AddMedicationPayload) => Promise<void> }) => (
    <button
      type="button"
      onClick={() => {
        void onSubmit({
          patientId: 'patient-1',
          medicationName: 'Metformin',
          dosage: '500 mg',
          startDate: '2026-07-03',
          scheduleType: 'daily',
          specificTimes: ['08:00'],
        }).catch(() => undefined);
      }}
    >
      Submit add medication
    </button>
  ),
}));

vi.mock('../../components/medications/EditMedicationForm', () => ({
  default: ({ onSubmit }: { onSubmit: (payload: EditMedicationPayload) => Promise<void> }) => (
    <button
      type="button"
      onClick={() => {
        void onSubmit({
          medicationName: 'Metformin XR',
          dosage: '500 mg',
          scheduleType: 'daily',
          specificTimes: ['08:00'],
        }).catch(() => undefined);
      }}
    >
      Submit edit medication
    </button>
  ),
}));

function makeMedication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'med-1',
    patientId: 'patient-1',
    medicationName: 'Metformin',
    genericName: null,
    dosage: '500 mg',
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
    startDate: '2026-07-03',
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
    createdAt: '2026-07-03T00:00:00.000Z',
    updatedAt: '2026-07-03T00:00:00.000Z',
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/groups/group-1/medications/add']}>
      <Routes>
        <Route path="/groups/:groupId/medications/add" element={<AddMedicationPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AddMedicationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    medicationsHookMock.medications = [];
    medicationsHookMock.loading = false;
    medicationsHookMock.error = null;
    medicationsHookMock.isSubmitting = false;
    medicationsHookMock.addMedication.mockResolvedValue(undefined);
    medicationsHookMock.editMedication.mockResolvedValue(undefined);
    medicationsHookMock.pauseMedication.mockResolvedValue(undefined);
    medicationsHookMock.activateMedication.mockResolvedValue(undefined);
    medicationsHookMock.archiveMedication.mockResolvedValue(undefined);
  });

  it('shows an error toast when adding medication fails', async () => {
    const user = userEvent.setup();
    medicationsHookMock.addMedication.mockRejectedValue(new Error('Failed to fetch'));

    renderPage();
    await user.click(screen.getByRole('button', { name: /submit add medication/i }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Failed to fetch');
    });
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it('shows an error toast and keeps the edit form open when editing medication fails', async () => {
    const user = userEvent.setup();
    medicationsHookMock.medications = [makeMedication()];
    medicationsHookMock.editMedication.mockRejectedValue(new Error('Failed to fetch'));

    renderPage();
    await user.click(screen.getByRole('button', { name: /^edit$/i }));
    await user.click(screen.getByRole('button', { name: /submit edit medication/i }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Failed to fetch');
    });
    expect(screen.getByText('Editing: Metformin')).toBeInTheDocument();
    expect(toastMock.success).not.toHaveBeenCalled();
  });
});