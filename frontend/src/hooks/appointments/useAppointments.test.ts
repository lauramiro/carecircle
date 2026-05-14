import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddAppointmentPayload, Appointment } from '../../api/appointments/appointments.types';
import { useAppointments } from './useAppointments';

// Mock the appointments mock service
vi.mock('../../api/appointments/appointments.mock', () => ({
  getAppointmentsByPatient: vi.fn(),
  addAppointment: vi.fn(),
  editAppointment: vi.fn(),
  deleteAppointment: vi.fn(),
}));

// Mock the Supabase client to prevent real-time subscription attempts
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn().mockResolvedValue(undefined),
  },
}));

import {
  getAppointmentsByPatient,
  addAppointment as addAppointmentService,
  editAppointment as editAppointmentService,
  deleteAppointment as deleteAppointmentService,
} from '../../api/appointments/appointments.mock';

const mockGet = vi.mocked(getAppointmentsByPatient);
const mockAdd = vi.mocked(addAppointmentService);
const mockEdit = vi.mocked(editAppointmentService);
const mockDelete = vi.mocked(deleteAppointmentService);

function makeAppt(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'appt-1',
    patientId: 'patient-1',
    title: 'GP Check-up',
    startTime: '2026-07-01T10:00:00.000Z',
    endTime: '2026-07-01T10:00:00.000Z',
    attendingCarerId: 'carer-1',
    specialistName: null,
    location: null,
    preVisitNotes: null,
    postVisitNotes: null,
    status: 'scheduled',
    createdBy: null,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

const BASE_PAYLOAD: AddAppointmentPayload = {
  patientId: 'patient-1',
  title: 'GP Check-up',
  startTime: '2026-07-01T10:00:00.000Z',
  attendingCarerId: 'carer-1',
};

describe('useAppointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue([]);
  });

  it('loads appointments on mount and clears loading state', async () => {
    const appt = makeAppt();
    mockGet.mockResolvedValue([appt]);

    const { result } = renderHook(() => useAppointments('patient-1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.appointments).toEqual([appt]);
    expect(result.current.error).toBeNull();
  });

  it('sets error message when load fails', async () => {
    mockGet.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useAppointments('patient-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to load appointments.');
    expect(result.current.appointments).toEqual([]);
  });

  it('returns an empty array when the patient has no appointments', async () => {
    mockGet.mockResolvedValue([]);

    const { result } = renderHook(() => useAppointments('patient-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.appointments).toEqual([]);
  });

  it('appends and sorts the new appointment after addAppointment', async () => {
    const early = makeAppt({ id: 'appt-early', startTime: '2026-06-01T10:00:00.000Z' });
    const late = makeAppt({ id: 'appt-late', startTime: '2026-08-01T10:00:00.000Z' });
    mockGet.mockResolvedValue([late]);
    mockAdd.mockResolvedValue(early);

    const { result } = renderHook(() => useAppointments('patient-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addAppointment(BASE_PAYLOAD);
    });

    expect(result.current.appointments).toHaveLength(2);
    expect(result.current.appointments[0].id).toBe('appt-early');
    expect(result.current.appointments[1].id).toBe('appt-late');
  });

  it('sets isSubmitting to true during addAppointment and resets it after', async () => {
    let resolveAdd!: (a: Appointment) => void;
    mockAdd.mockReturnValue(new Promise<Appointment>((res) => { resolveAdd = res; }));
    mockGet.mockResolvedValue([]);

    const { result } = renderHook(() => useAppointments('patient-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      void result.current.addAppointment(BASE_PAYLOAD);
    });

    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      resolveAdd(makeAppt({ id: 'appt-new' }));
    });

    expect(result.current.isSubmitting).toBe(false);
  });

  it('replaces the appointment in-place after editAppointment', async () => {
    const original = makeAppt({ id: 'appt-1', title: 'Old Title' });
    const updated = makeAppt({ id: 'appt-1', title: 'New Title' });
    mockGet.mockResolvedValue([original]);
    mockEdit.mockResolvedValue(updated);

    const { result } = renderHook(() => useAppointments('patient-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.editAppointment('appt-1', { title: 'New Title' });
    });

    expect(result.current.appointments).toHaveLength(1);
    expect(result.current.appointments[0].title).toBe('New Title');
  });

  it('removes the appointment from the list after deleteAppointment', async () => {
    const appt = makeAppt({ id: 'appt-1' });
    mockGet.mockResolvedValue([appt]);
    mockDelete.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAppointments('patient-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteAppointment('appt-1');
    });

    expect(result.current.appointments).toHaveLength(0);
  });

  it('sets isSubmitting to true during deleteAppointment and resets it after', async () => {
    const appt = makeAppt();
    mockGet.mockResolvedValue([appt]);
    let resolveDelete!: () => void;
    mockDelete.mockReturnValue(new Promise<void>((res) => { resolveDelete = res; }));

    const { result } = renderHook(() => useAppointments('patient-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      void result.current.deleteAppointment('appt-1');
    });

    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      resolveDelete();
    });

    expect(result.current.isSubmitting).toBe(false);
  });
});
