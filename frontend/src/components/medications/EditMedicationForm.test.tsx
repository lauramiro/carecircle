import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Medication } from '../../api/medications/medications.types';
import EditMedicationForm from './EditMedicationForm';

vi.mock('../../api/medications/medications.service', () => ({
  checkDuplicateName: vi.fn(),
}));

import { checkDuplicateName } from '../../api/medications/medications.service';

const mockCheckDuplicateName = vi.mocked(checkDuplicateName);

function makeMed(overrides: Partial<Medication> = {}): Medication {
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
    specificTimes: ['08:00', '18:00'],
    intervalHours: null,
    daysOfWeek: null,
    dayOfMonth: null,
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

describe('EditMedicationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows additional detail fields expanded for editing', () => {
    render(
      <EditMedicationForm
        initialValues={makeMed()}
        isSubmitting={false}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/instructions/i)).toBeInTheDocument();
    expect(screen.getByText('Additional details')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Pharmacy name')).toBeInTheDocument();
  });

  it('pre-populates all fields from the initial medication', () => {
    render(
      <EditMedicationForm
        initialValues={makeMed()}
        isSubmitting={false}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/medication name/i)).toHaveValue('Metformin');
    expect(screen.getByPlaceholderText('e.g. 500')).toHaveValue(500);
    expect(screen.getByLabelText(/unit/i)).toHaveValue('mg');
    expect(screen.getByRole('radio', { name: 'Daily' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'At specific times' })).toBeChecked();
    expect(screen.getByRole('button', { name: /Morning/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Evening/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('parses a dosage string with mcg unit correctly', () => {
    render(
      <EditMedicationForm
        initialValues={makeMed({ dosage: '25 mcg' })}
        isSubmitting={false}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText('e.g. 500')).toHaveValue(25);
    expect(screen.getByLabelText(/unit/i)).toHaveValue('mcg');
  });

  it('calls onSubmit with the changed payload when the name is unchanged (no duplicate check)', async () => {
    mockCheckDuplicateName.mockResolvedValue(false);
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <EditMedicationForm
        initialValues={makeMed()}
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });
    expect(mockCheckDuplicateName).not.toHaveBeenCalled();
  });

  it('payload contains the new schedule fields on submit', async () => {
    mockCheckDuplicateName.mockResolvedValue(false);
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <EditMedicationForm
        initialValues={makeMed()}
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());

    const changes = onSubmit.mock.calls[0][0];
    expect(changes.scheduleType).toBe('daily');
    expect(changes.specificTimes).toEqual(['08:00', '18:00']);
  });

  it('skips duplicate check and calls onSubmit when name changes to a unique name', async () => {
    mockCheckDuplicateName.mockResolvedValue(false);
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <EditMedicationForm
        initialValues={makeMed()}
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    const nameInput = screen.getByLabelText(/medication name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Metformin XR');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });
    expect(mockCheckDuplicateName).toHaveBeenCalledWith('patient-1', 'Metformin XR');
  });

  it('shows duplicate warning when the new name conflicts with an existing medication', async () => {
    mockCheckDuplicateName.mockResolvedValue(true);
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <EditMedicationForm
        initialValues={makeMed()}
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    const nameInput = screen.getByLabelText(/medication name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Amlodipine');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit when Save anyway is clicked after the duplicate warning', async () => {
    mockCheckDuplicateName.mockResolvedValue(true);
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <EditMedicationForm
        initialValues={makeMed()}
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    const nameInput = screen.getByLabelText(/medication name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Amlodipine');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /save anyway/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });
  });

  it('dismisses the duplicate warning without submitting when Cancel is clicked', async () => {
    mockCheckDuplicateName.mockResolvedValue(true);
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <EditMedicationForm
        initialValues={makeMed()}
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    const nameInput = screen.getByLabelText(/medication name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Amlodipine');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });

    const alert = screen.getByRole('alert');
    await user.click(within(alert).getByRole('button', { name: /^cancel$/i }));

    await waitFor(() => {
      expect(screen.queryByText(/already exists/i)).not.toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not check for duplicates when the name is changed back to the original (case-insensitive)', async () => {
    mockCheckDuplicateName.mockResolvedValue(false);
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <EditMedicationForm
        initialValues={makeMed({ medicationName: 'Metformin' })}
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    const nameInput = screen.getByLabelText(/medication name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'METFORMIN');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });
    expect(mockCheckDuplicateName).not.toHaveBeenCalled();
  });

  it('shows validation errors and does not call onSubmit when required fields are cleared', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <EditMedicationForm
        initialValues={makeMed()}
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    const nameInput = screen.getByLabelText(/medication name/i);
    await user.clear(nameInput);
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText('Medication name is required')).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onCancel when the Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <EditMedicationForm
        initialValues={makeMed()}
        isSubmitting={false}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows Saving... and disables the submit button while isSubmitting is true', () => {
    render(
      <EditMedicationForm
        initialValues={makeMed()}
        isSubmitting={true}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const submitButton = screen.getByRole('button', { name: /saving/i });
    expect(submitButton).toBeDisabled();
  });
});
