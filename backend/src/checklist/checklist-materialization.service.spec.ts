import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ChecklistMaterializationService } from './checklist-materialization.service';

describe('ChecklistMaterializationService', () => {
  const medicationRepo = {
    findById: vi.fn(),
    updateMaterializationCursor: vi.fn(),
  };
  const checklistRepo = {
    findPendingSchedulesDue: vi.fn(),
    ensureDailyChecklist: vi.fn(),
    insertChecklistItems: vi.fn(),
    upsertSchedule: vi.fn(),
    countFutureDueItems: vi.fn(),
  };
  const careGroupRepo = {
    getGroupContextByPatientId: vi.fn(),
  };
  const appConfig = {
    materializationBatchSize: 100,
  };

  let service: ChecklistMaterializationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ChecklistMaterializationService(
      medicationRepo as never,
      checklistRepo as never,
      careGroupRepo as never,
      appConfig as never,
    );
  });

  it('extendPendingSchedules materializes each due pending schedule', async () => {
    checklistRepo.findPendingSchedulesDue.mockResolvedValue([
      { medication_id: 'med-1', cursor_at: null },
      { medication_id: 'med-2', cursor_at: '2025-05-20T08:00:00.000Z' },
    ]);
    medicationRepo.findById.mockResolvedValue(null);

    await service.extendPendingSchedules(20);

    expect(checklistRepo.findPendingSchedulesDue).toHaveBeenCalledWith(24, 20);
    expect(medicationRepo.findById).toHaveBeenCalledTimes(2);
  });

  it('extendPendingSchedules marks schedule failed when materialization throws', async () => {
    checklistRepo.findPendingSchedulesDue.mockResolvedValue([
      { medication_id: 'med-1', cursor_at: null, status: 'pending' },
    ]);
    medicationRepo.findById.mockRejectedValue(new Error('db down'));

    await service.extendPendingSchedules(5);

    expect(checklistRepo.upsertSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        medicationId: 'med-1',
        status: 'failed',
        lastError: 'db down',
      }),
    );
  });
});
