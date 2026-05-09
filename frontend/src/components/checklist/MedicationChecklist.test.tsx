import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MedicationChecklist from '@components/checklist/MedicationChecklist';
import type { ChecklistItem } from '@lib/checklist';

const checklistHookMock = vi.hoisted(() => ({
  useChecklistSubscription: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const selectEqMock = vi.hoisted(() => vi.fn());
const selectMock = vi.hoisted(() => vi.fn());
const updateEqMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());
const uploadMock = vi.hoisted(() => vi.fn());
const storageFromMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());
const getUserMock = vi.hoisted(() => vi.fn());

vi.mock('@hooks/checklist/useChecklistSubscription', () => ({
  useChecklistSubscription: checklistHookMock.useChecklistSubscription,
}));

vi.mock('@hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

vi.mock('@components/checklist/SkipReasonModal', () => ({
  default: () => null,
}));

vi.mock('@lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: getUserMock,
    },
    from: fromMock,
    storage: {
      from: storageFromMock,
    },
  },
}));

function buildItem(id: string, status: ChecklistItem['status'], time = '08:00'): ChecklistItem {
  return {
    id,
    medication_id: `med-${id}`,
    medication_name: `Medication ${id}`,
    dosage: '1',
    dosage_unit: 'tablet',
    time_window: {
      time_of_day: time,
      window_start: '08:00',
      window_end: '09:00',
    },
    status,
    given_at: null,
    given_by_user_id: null,
    skip_reason: null,
    skip_notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

describe('MedicationChecklist mark-as-given photo flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    selectEqMock.mockResolvedValue({
      data: [buildItem('due-1', 'due')],
      error: null,
    });
    selectMock.mockReturnValue({ eq: selectEqMock });

    updateEqMock.mockResolvedValue({ error: null });
    updateMock.mockReturnValue({ eq: updateEqMock });

    fromMock.mockImplementation(() => ({
      select: selectMock,
      update: updateMock,
    }));

    uploadMock.mockResolvedValue({ error: null });
    storageFromMock.mockReturnValue({ upload: uploadMock });

    getUserMock.mockResolvedValue({
      data: { user: { id: 'caregiver-001' } },
    });

    checklistHookMock.useChecklistSubscription.mockImplementation(
      (_checklistId: string, initialItems: ChecklistItem[]) => ({
        items: initialItems,
        isSubscribed: true,
        error: null,
      }),
    );
  });

  it('renders Mark as Given for each due or overdue item', async () => {
    const items = [
      buildItem('due-1', 'due', '08:00'),
      buildItem('overdue-1', 'overdue', '10:00'),
      buildItem('given-1', 'given', '13:00'),
    ];
    selectEqMock.mockResolvedValueOnce({ data: items, error: null });

    render(<MedicationChecklist checklistId="checklist-1" userRole="primary" />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /mark as given/i })).toHaveLength(2);
    });
  });

  it('opens picker immediately and does not update status before photo selection', async () => {
    const user = userEvent.setup();
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => undefined);

    render(<MedicationChecklist checklistId="checklist-2" userRole="primary" />);

    const markAsGiven = await screen.findByRole('button', { name: /mark as given/i });
    await user.click(markAsGiven);

    expect(clickSpy).toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  it('updates status to given only after successful photo upload', async () => {
    render(<MedicationChecklist checklistId="checklist-3" userRole="primary" />);

    const markAsGiven = await screen.findByRole('button', { name: /mark as given/i });
    await userEvent.click(markAsGiven);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();

    const proofPhoto = new File(['proof'], 'proof.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput!, { target: { files: [proofPhoto] } });

    await waitFor(() => {
      expect(uploadMock).toHaveBeenCalledTimes(1);
      expect(updateMock).toHaveBeenCalledTimes(1);
      expect(updateEqMock).toHaveBeenCalledTimes(1);
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'given',
        given_by_user_id: 'caregiver-001',
      }),
    );

    expect(uploadMock.mock.invocationCallOrder[0]).toBeLessThan(
      updateMock.mock.invocationCallOrder[0],
    );
    expect(toastMock.success).toHaveBeenCalled();
  });
});
