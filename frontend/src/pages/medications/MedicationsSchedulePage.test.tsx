import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Group } from '../../api/groups/groups.types';
import type { Medication } from '../../api/medications/medications.types';
import MedicationsSchedulePage from './MedicationsSchedulePage';

const groupHookMock = vi.hoisted(() => ({
  value: {
    loading: false,
    error: null as string | null,
    group: {
      id: 'group-001',
      name: 'Dad Care Circle',
      description: '',
      role: 'Admin' as const,
      createdAt: '2025-01-01T00:00:00.000Z',
      patientId: 'patient-001',
      members: [],
    } as unknown as Group,
  },
}));

const medsHookMock = vi.hoisted(() => ({
  value: {
    loading: false,
    error: null as string | null,
    medications: [] as Medication[],
    isSubmitting: false,
    addMedication: vi.fn(),
    editMedication: vi.fn(),
    pauseMedication: vi.fn(),
    activateMedication: vi.fn(),
    archiveMedication: vi.fn(),
  },
}));

vi.mock('../../hooks/groups/useGroupDetail', () => ({
  useGroupDetail: () => groupHookMock.value,
}));

vi.mock('../../hooks/medications/useMedications', () => ({
  useMedications: () => medsHookMock.value,
}));

function makeMed(overrides: Partial<Medication>): Medication {
  return {
    id: 'med-1',
    patientId: 'patient-001',
    medicationName: 'Aspirin',
    genericName: null,
    dosage: '100 mg',
    form: null,
    prescribedBy: null,
    prescribedDate: null,
    prescriptionNumber: null,
    frequency: 'once_daily',
    timeOfDay: ['Morning'],
    specificTimes: null,
    instructions: null,
    route: null,
    takeWithFood: null,
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

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/groups/group-001/medications']}>
      <Routes>
        <Route path="/groups/:groupId/medications" element={<MedicationsSchedulePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MedicationsSchedulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    medsHookMock.value.medications = [];
  });

  it('renders the time window section for medications that have it', () => {
    medsHookMock.value.medications = [
      makeMed({ id: 'med-1', medicationName: 'Aspirin', timeOfDay: ['Morning'] }),
      makeMed({ id: 'med-2', medicationName: 'Ibuprofen', timeOfDay: ['Evening'] }),
    ];
    renderPage();

    expect(screen.getByText('Morning')).toBeInTheDocument();
    expect(screen.getByText('Evening')).toBeInTheDocument();
    expect(screen.getByText('Aspirin')).toBeInTheDocument();
    expect(screen.getByText('Ibuprofen')).toBeInTheDocument();
  });

  it('does not render a time window section that has no medications', () => {
    medsHookMock.value.medications = [
      makeMed({ id: 'med-1', medicationName: 'Aspirin', timeOfDay: ['Morning'] }),
    ];
    renderPage();

    expect(screen.getByText('Morning')).toBeInTheDocument();
    expect(screen.queryByText('Afternoon')).not.toBeInTheDocument();
    expect(screen.queryByText('Evening')).not.toBeInTheDocument();
    expect(screen.queryByText('Night')).not.toBeInTheDocument();
  });

  it('shows the Paused badge on paused medications', () => {
    medsHookMock.value.medications = [
      makeMed({ id: 'med-1', medicationName: 'Metformin', status: 'paused', timeOfDay: ['Morning'] }),
    ];
    renderPage();

    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('does not render archived medications', () => {
    medsHookMock.value.medications = [
      makeMed({ id: 'med-1', medicationName: 'ArchivedMed', status: 'archived', timeOfDay: ['Morning'] }),
      makeMed({ id: 'med-2', medicationName: 'ActiveMed', status: 'active', timeOfDay: ['Night'] }),
    ];
    renderPage();

    expect(screen.queryByText('ArchivedMed')).not.toBeInTheDocument();
    expect(screen.getByText('ActiveMed')).toBeInTheDocument();
  });

  it('shows the empty state when there are no active or paused medications', () => {
    medsHookMock.value.medications = [];
    renderPage();

    expect(screen.getByText('No medications in the schedule yet.')).toBeInTheDocument();
  });

  it('shows the Add medication button for Admin users', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /add medication/i })).toBeInTheDocument();
  });

  it('does not show the Add medication button for non-Admin users', () => {
    groupHookMock.value = {
      ...groupHookMock.value,
      group: { ...groupHookMock.value.group!, role: 'Member' as const },
    };
    renderPage();
    expect(screen.queryByRole('button', { name: /add medication/i })).not.toBeInTheDocument();
    // restore
    groupHookMock.value = {
      ...groupHookMock.value,
      group: { ...groupHookMock.value.group!, role: 'Admin' as const },
    };
  });
});
