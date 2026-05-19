import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AddMedicationForm from './AddMedicationForm';

vi.mock('../../api/medications/medications.service', () => ({
  checkDuplicateName: vi.fn(),
}));

import { checkDuplicateName } from '../../api/medications/medications.service';

const mockCheckDuplicateName = vi.mocked(checkDuplicateName);

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/medication name/i), 'Metformin');
  await user.type(screen.getByPlaceholderText('e.g. 500'), '500');
  await user.selectOptions(screen.getByLabelText(/unit/i), 'mg');
  await user.click(screen.getByRole('radio', { name: 'Daily' }));
  await user.click(screen.getByRole('button', { name: /Morning/i }));
}

describe('AddMedicationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls onSubmit directly when name is unique', async () => {
    mockCheckDuplicateName.mockResolvedValue(false);
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <AddMedicationForm
        patientId="patient-1"
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /add medication/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });
    expect(screen.queryByText(/already exists/i)).not.toBeInTheDocument();
  });

  it('shows duplicate warning and does not call onSubmit when name is a duplicate', async () => {
    mockCheckDuplicateName.mockResolvedValue(true);
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <AddMedicationForm
        patientId="patient-1"
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /add medication/i }));

    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('dismisses the warning and does not call onSubmit when Cancel is clicked', async () => {
    mockCheckDuplicateName.mockResolvedValue(true);
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <AddMedicationForm
        patientId="patient-1"
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /add medication/i }));

    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    await waitFor(() => {
      expect(screen.queryByText(/already exists/i)).not.toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit when Add anyway is clicked after the duplicate warning', async () => {
    mockCheckDuplicateName.mockResolvedValue(true);
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <AddMedicationForm
        patientId="patient-1"
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /add medication/i }));

    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add anyway/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });
  });

  it('payload contains the new schedule fields on submit', async () => {
    mockCheckDuplicateName.mockResolvedValue(false);
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <AddMedicationForm
        patientId="patient-1"
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /add medication/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());

    const payload = onSubmit.mock.calls[0][0];
    expect(payload.scheduleType).toBe('daily');
    expect(payload.specificTimes).toEqual(['08:00']);
    expect(payload.medicationName).toBe('Metformin');
    expect(payload.dosage).toBe('500 mg');
  });

  it('shows a validation error when Daily is selected with no time filled in', async () => {
    mockCheckDuplicateName.mockResolvedValue(false);
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <AddMedicationForm
        patientId="patient-1"
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/medication name/i), 'Metformin');
    await user.type(screen.getByPlaceholderText('e.g. 500'), '500');
    await user.selectOptions(screen.getByLabelText(/unit/i), 'mg');
    await user.click(screen.getByRole('radio', { name: 'Daily' }));
    // Do not fill in a time — leave the empty slot as-is

    await user.click(screen.getByRole('button', { name: /add medication/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least one time is required/i)).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits successfully for an as-needed medication without any times', async () => {
    mockCheckDuplicateName.mockResolvedValue(false);
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <AddMedicationForm
        patientId="patient-1"
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/medication name/i), 'Salbutamol');
    await user.type(screen.getByPlaceholderText('e.g. 500'), '100');
    await user.selectOptions(screen.getByLabelText(/unit/i), 'mcg');
    await user.click(screen.getByRole('radio', { name: 'As needed' }));
    await user.click(screen.getByRole('button', { name: /add medication/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());

    const payload = onSubmit.mock.calls[0][0];
    expect(payload.scheduleType).toBe('as_needed');
    expect(payload.specificTimes).toBeUndefined();
  });
});
