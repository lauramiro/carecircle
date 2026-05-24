import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  activateMedication,
  addMedication,
  archiveMedication,
  editMedication,
  pauseMedication,
} from './medications.service';

const fetchMock = vi.hoisted(() => vi.fn());

describe('medications.service API mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  function mockJsonResponse(data: Record<string, unknown>) {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => data,
    });
  }

  const medicationRow = {
    id: 'med-1',
    patient_id: 'patient-1',
    medication_name: 'Metformin',
    dose: 500,
    unit: 'mg',
    schedule_type: 'daily',
    specific_times: ['08:00'],
    interval_hours: null,
    days_of_week: null,
    day_of_month: null,
    start_date: '2025-01-01',
    end_date: null,
    perpetual: true,
    total_doses: null,
    status: 'active',
    form: null,
    route: null,
    instructions: null,
    take_with_food: null,
    generic_name: null,
    prescribed_by: null,
    prescribed_date: null,
    prescription_number: null,
    refills_remaining: null,
    last_refill_date: null,
    pharmacy: null,
    pharmacy_phone: null,
    side_effects: null,
    notes: null,
    discontinued_date: null,
    discontinued_reason: null,
    version: 1,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  it('addMedication posts course bounds and schedule to the backend API', async () => {
    mockJsonResponse(medicationRow);

    await addMedication('group-1', {
      patientId: 'patient-1',
      medicationName: 'Metformin',
      dosage: '500 mg',
      startDate: '2025-01-01',
      scheduleType: 'daily',
      specificTimes: ['08:00'],
      perpetual: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/groups/group-1/medications',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          patientId: 'patient-1',
          medicationName: 'Metformin',
          dose: 500,
          unit: 'mg',
          startDate: '2025-01-01',
          scheduleType: 'daily',
          specificTimes: ['08:00'],
          perpetual: true,
        }),
      }),
    );
  });

  it('editMedication PATCHes schedule changes to the backend API', async () => {
    mockJsonResponse({ ...medicationRow, end_date: '2025-12-31', perpetual: false });

    await editMedication('group-1', 'med-1', {
      endDate: '2025-12-31',
      perpetual: false,
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe('PATCH');
    expect(JSON.parse(String(init?.body))).toEqual({
      perpetual: false,
      endDate: '2025-12-31',
    });
  });

  it('pauseMedication calls the pause endpoint', async () => {
    mockJsonResponse({ ...medicationRow, status: 'paused' });

    await pauseMedication('group-1', 'med-1');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/groups/group-1/medications/med-1/pause',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('activateMedication calls the activate endpoint', async () => {
    mockJsonResponse(medicationRow);

    await activateMedication('group-1', 'med-1');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/groups/group-1/medications/med-1/activate',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('archiveMedication calls the archive endpoint', async () => {
    mockJsonResponse({ ...medicationRow, status: 'archived' });

    await archiveMedication('group-1', 'med-1');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/groups/group-1/medications/med-1/archive',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
