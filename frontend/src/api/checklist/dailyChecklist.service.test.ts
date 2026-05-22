import { beforeEach, describe, expect, it, vi } from 'vitest';
import { syncChecklistItems } from './dailyChecklist.service';

const fromMock = vi.hoisted(() => vi.fn());
const getMedicationsMock = vi.hoisted(() => vi.fn());

vi.mock('../../lib/supabaseClient', () => ({
  supabase: { from: fromMock },
}));

vi.mock('../medications/medications.service', () => ({
  getMedicationsByPatient: getMedicationsMock,
}));

function checklistItemsTable(options: {
  existing?: Array<{ id: string; medication_id: string; scheduled_time: string; status: string }>;
  insert?: ReturnType<typeof vi.fn>;
  deleteIn?: ReturnType<typeof vi.fn>;
}) {
  const insertMock = options.insert ?? vi.fn().mockResolvedValue({ error: null });
  const deleteInMock = options.deleteIn ?? vi.fn().mockResolvedValue({ error: null });

  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: options.existing ?? [], error: null }),
    }),
    delete: vi.fn().mockReturnValue({ in: deleteInMock }),
    insert: insertMock,
  };
}

describe('syncChecklistItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMedicationsMock.mockResolvedValue([
      {
        id: 'med-1',
        patientId: 'patient-1',
        medicationName: 'Amlodipine',
        dosage: '10 mg',
        scheduleType: 'daily',
        specificTimes: ['08:00', '20:00'],
        intervalHours: null,
        daysOfWeek: null,
        dayOfMonth: null,
        startDate: '2025-01-01',
        endDate: null,
        status: 'active',
      },
    ]);
  });

  it('inserts one row per scheduled time for active medications', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === 'checklist_items') {
        return checklistItemsTable({ insert: insertMock });
      }
      return {};
    });

    await syncChecklistItems({
      checklistId: 'checklist-1',
      patientId: 'patient-1',
      checklistDate: '2025-05-21',
    });

    expect(insertMock).toHaveBeenCalledTimes(1);
    const rows = insertMock.mock.calls[0][0] as Record<string, unknown>[];
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.scheduled_time)).toEqual(['08:00', '20:00']);
    expect(rows.map((r) => r.time_of_day)).toEqual(['08:00', '20:00']);
    expect(rows.every((r) => r.medication_id === 'med-1')).toBe(true);
  });

  it('does not insert duplicate slots on re-sync', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === 'checklist_items') {
        return checklistItemsTable({
          existing: [{ id: 'item-1', medication_id: 'med-1', scheduled_time: '08:00', status: 'due' }],
          insert: insertMock,
        });
      }
      return {};
    });

    await syncChecklistItems({
      checklistId: 'checklist-1',
      patientId: 'patient-1',
      checklistDate: '2025-05-21',
    });

    expect(insertMock).toHaveBeenCalledTimes(1);
    const rows = insertMock.mock.calls[0][0] as Record<string, unknown>[];
    expect(rows).toHaveLength(1);
    expect(rows[0].scheduled_time).toBe('20:00');
  });

  it('removes stale due items that are no longer on the schedule', async () => {
    const deleteInMock = vi.fn().mockResolvedValue({ error: null });
    const insertMock = vi.fn().mockResolvedValue({ error: null });

    fromMock.mockImplementation((table: string) => {
      if (table === 'checklist_items') {
        return checklistItemsTable({
          existing: [
            { id: 'stale-1', medication_id: 'med-1', scheduled_time: '12:00', status: 'due' },
            { id: 'kept-1', medication_id: 'med-1', scheduled_time: '08:00', status: 'given' },
          ],
          insert: insertMock,
          deleteIn: deleteInMock,
        });
      }
      return {};
    });

    await syncChecklistItems({
      checklistId: 'checklist-1',
      patientId: 'patient-1',
      checklistDate: '2025-05-21',
    });

    expect(deleteInMock).toHaveBeenCalledWith('id', ['stale-1']);
    const rows = insertMock.mock.calls[0][0] as Record<string, unknown>[];
    expect(rows).toHaveLength(1);
    expect(rows[0].scheduled_time).toBe('20:00');
  });

  it('does not delete given or skipped items even when off schedule', async () => {
    const deleteInMock = vi.fn().mockResolvedValue({ error: null });

    fromMock.mockImplementation((table: string) => {
      if (table === 'checklist_items') {
        return checklistItemsTable({
          existing: [
            { id: 'skip-1', medication_id: 'med-1', scheduled_time: '12:00', status: 'skipped' },
          ],
          deleteIn: deleteInMock,
        });
      }
      return {};
    });

    await syncChecklistItems({
      checklistId: 'checklist-1',
      patientId: 'patient-1',
      checklistDate: '2025-05-21',
    });

    expect(deleteInMock).not.toHaveBeenCalled();
  });
});
