import { describe, expect, it, vi } from 'vitest';
import { loadDailyChecklist } from './dailyChecklist.service';

const fromMock = vi.hoisted(() => vi.fn());

vi.mock('../../lib/supabaseClient', () => ({
  supabase: { from: fromMock },
}));

describe('loadDailyChecklist', () => {
  it('loads checklist items without syncing', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'daily_medication_checklists') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'cl-1' }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'checklist_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'item-1',
                    checklist_id: 'cl-1',
                    medication_id: 'med-1',
                    medication_name: 'Test',
                    dose: 10,
                    dosage_unit: 'mg',
                    scheduled_time: '08:00',
                    window_start: '07:30',
                    window_end: '08:30',
                    status: 'due',
                    created_at: '2025-01-01T00:00:00Z',
                    updated_at: '2025-01-01T00:00:00Z',
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await loadDailyChecklist({
      patientId: 'patient-1',
      groupId: 'group-1',
      checklistDate: '2025-05-21',
    });

    expect(result.checklistId).toBe('cl-1');
    expect(result.items).toHaveLength(1);
  });
});
