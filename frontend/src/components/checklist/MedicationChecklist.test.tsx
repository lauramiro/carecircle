import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROLE } from '@typings/role-enum';
import MedicationChecklist from '@components/checklist/MedicationChecklist';
import type { ChecklistItem } from '@lib/checklist';

const checklistHookMock = vi.hoisted(() => ({
  useChecklistSubscription: vi.fn(),
}));

vi.mock('@hooks/checklist/useChecklistSubscription', () => ({
  useChecklistSubscription: checklistHookMock.useChecklistSubscription,
}));

vi.mock('@hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}));

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@components/checklist/SkipReasonModal', () => ({
  default: () => null,
}));

vi.mock('@components/checklist/MarkAsGivenModal', () => ({
  default: ({ open, onGiven }: { open: boolean; onGiven: () => void }) =>
    open ? (
      <button type="button" onClick={onGiven}>
        Confirm given
      </button>
    ) : null,
}));

vi.mock('@lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: null } }),
      }),
    },
  },
}));

function buildItem(
  id: string,
  status: ChecklistItem['status'],
  scheduledTime = '08:00',
  overrides: Partial<ChecklistItem> = {},
): ChecklistItem {
  return {
    id,
    medication_id: `med-${id}`,
    medication_name: `Medication ${id}`,
    dosage: '1',
    dosage_unit: 'tablet',
    scheduled_time: scheduledTime,
    time_window: {
      time_of_day: scheduledTime,
      window_start: scheduledTime,
      window_end: '09:00',
    },
    status,
    given_at: null,
    given_by_user_id: null,
    skip_reason: null,
    skip_notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const defaultItems = [
  buildItem('due-1', 'due', '08:00'),
  buildItem('overdue-1', 'overdue', '10:00'),
  buildItem('given-1', 'given', '13:00'),
];

describe('MedicationChecklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checklistHookMock.useChecklistSubscription.mockImplementation(
      (_checklistId: string, _date: string, initialItems: ChecklistItem[]) => ({
        items: initialItems,
        isSubscribed: true,
        error: null,
        patchItem: vi.fn(),
      }),
    );
  });

  it('renders Mark given for due and overdue items in chronological order', async () => {
    render(
      <MedicationChecklist
        checklistId="checklist-1"
        checklistDate="2026-01-01"
        items={defaultItems}
        userRole={ROLE.PRIMARY_CAREGIVER}
      />,
    );

    expect(screen.getAllByRole('button', { name: /mark given/i })).toHaveLength(2);

    const names = screen.getAllByText(/Medication /).map((el) => el.textContent);
    expect(names[0]).toContain('due-1');
    expect(names[1]).toContain('overdue-1');
  });

  it('opens mark given modal when Mark given is clicked', async () => {
    render(
      <MedicationChecklist
        checklistId="checklist-2"
        checklistDate="2026-01-01"
        items={defaultItems}
        userRole={ROLE.PRIMARY_CAREGIVER}
      />,
    );

    const markGivenButtons = await screen.findAllByRole('button', { name: /mark given/i });
    await userEvent.click(markGivenButtons[0]!);

    expect(await screen.findByRole('button', { name: /confirm given/i })).toBeInTheDocument();
  });

  it('opens proof viewer for given items', async () => {
    render(
      <MedicationChecklist
        checklistId="checklist-5"
        checklistDate="2026-01-01"
        items={[
          buildItem('given-42', 'given', '08:00', {
            given_by_carer_id: 'caregiver-001',
            given_at: '2026-01-01T08:05:00.000Z',
          }),
        ]}
        userRole={ROLE.PRIMARY_CAREGIVER}
      />,
    );

    await userEvent.click(await screen.findByText('Medication given-42'));
    expect(await screen.findByRole('dialog', { name: /medication confirmation photo/i })).toBeInTheDocument();
  });
});
