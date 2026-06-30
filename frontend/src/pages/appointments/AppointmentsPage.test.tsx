import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Appointment } from '../../api/appointments/appointments.types';
import AppointmentsPage from './AppointmentsPage';

const deleteAppointmentMock = vi.hoisted(() => vi.fn());

const appointmentsHookMock = vi.hoisted(() => ({
  value: {
    appointments: [] as Appointment[],
    loading: false,
    isSubmitting: false,
    deleteAppointment: deleteAppointmentMock,
  },
}));

const groupDetailHookMock = vi.hoisted(() => ({
  value: {
    loading: false,
    error: null as string | null,
    group: {
      id: 'group-care-001',
      patientId: 'patient-001',
      name: 'Dad Care Circle',
      canSchedule: true,
      members: [{ id: 'carer-001', name: 'Laura Miro' }],
    },
  },
}));

vi.mock('../../hooks/appointments/useAppointments', () => ({
  useAppointments: () => appointmentsHookMock.value,
}));

vi.mock('../../hooks/groups/useGroupDetail', () => ({
  useGroupDetail: () => groupDetailHookMock.value,
}));

function makeAppointment(overrides: Partial<Appointment>): Appointment {
  return {
    id: 'appt-001',
    patientId: 'patient-001',
    title: 'GP review',
    startTime: new Date(2026, 5, 30, 16, 0, 0).toISOString(),
    endTime: new Date(2026, 5, 30, 16, 30, 0).toISOString(),
    attendingCarerId: 'carer-001',
    specialistName: null,
    specialistPhone: null,
    location: null,
    preVisitNotes: null,
    postVisitNotes: null,
    status: 'scheduled',
    createdBy: null,
    createdAt: null,
    updatedAt: null,
    recurrenceRule: null,
    recurrenceSeriesId: null,
    ...overrides,
  };
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/groups/group-care-001/appointments']}>
      <Routes>
        <Route path="/groups/:groupId/appointments" element={<AppointmentsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppointmentsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 30, 15, 0, 0));
    vi.clearAllMocks();
    appointmentsHookMock.value = {
      appointments: [],
      loading: false,
      isSubmitting: false,
      deleteAppointment: deleteAppointmentMock,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a read-only status instead of Cancel for appointments before today', () => {
    appointmentsHookMock.value.appointments = [
      makeAppointment({
        id: 'past-appt',
        startTime: new Date(2026, 5, 29, 10, 0, 0).toISOString(),
        endTime: new Date(2026, 5, 29, 10, 30, 0).toISOString(),
      }),
    ];

    renderPage();

    expect(screen.getByText('Passed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });

  it('keeps Cancel available for appointments earlier today', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    appointmentsHookMock.value.appointments = [
      makeAppointment({
        id: 'today-appt',
        startTime: new Date(2026, 5, 30, 9, 0, 0).toISOString(),
        endTime: new Date(2026, 5, 30, 9, 30, 0).toISOString(),
      }),
    ];

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(confirmSpy).toHaveBeenCalledWith('Cancel appointment "GP review"?');
    expect(deleteAppointmentMock).toHaveBeenCalledWith('today-appt');
  });
});