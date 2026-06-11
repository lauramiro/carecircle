import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NextAppointmentWidget from './NextAppointmentWidget';
import type { AppointmentWithCarer } from '../../api/appointments/appointments.service';

const hookMock = vi.hoisted(() => ({
  value: {
    appointment: null as AppointmentWithCarer | null,
    loading: false,
    error: null as string | null,
  },
}));

vi.mock('@hooks/dashboard/useNextAppointment', () => ({
  useNextAppointment: () => hookMock.value,
}));

const BASE_APPOINTMENT: AppointmentWithCarer = {
  id: 'appt-1',
  patientId: 'p1',
  title: 'GP Check-up',
  startTime: '2026-06-01T10:30:00.000Z',
  endTime: '2026-06-01T11:30:00.000Z',
  attendingCarerId: 'carer-1',
  carerName: 'Alice Smith',
  specialistName: null,
  location: null,
  preVisitNotes: null,
  postVisitNotes: null,
  status: 'scheduled',
  createdBy: null,
  createdAt: null,
  updatedAt: null,
  recurrenceRule: null,
  recurrenceSeriesId: null,
};

function renderWidget() {
  return render(
    <MemoryRouter>
      <NextAppointmentWidget patientId="p1" groupId="g1" groupName="Dad Care Circle" />
    </MemoryRouter>,
  );
}

describe('NextAppointmentWidget', () => {
  beforeEach(() => {
    hookMock.value = { appointment: null, loading: false, error: null };
  });

  it('shows the widget title and group name', () => {
    renderWidget();
    expect(screen.getByText('Next Appointment')).toBeInTheDocument();
    expect(screen.getByText('Dad Care Circle')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    hookMock.value = { appointment: null, loading: true, error: null };
    renderWidget();
    expect(screen.getByText('Loading appointment…')).toBeInTheDocument();
  });

  it('shows error state', () => {
    hookMock.value = { appointment: null, loading: false, error: 'Failed to load appointment.' };
    renderWidget();
    expect(screen.getByText('Failed to load appointment.')).toBeInTheDocument();
  });

  it('shows empty state when no upcoming appointments', () => {
    renderWidget();
    expect(screen.getByText('No upcoming appointments.')).toBeInTheDocument();
  });

  it('shows appointment title, date, time, and carer name', () => {
    hookMock.value = { appointment: BASE_APPOINTMENT, loading: false, error: null };
    renderWidget();
    expect(screen.getByText('GP Check-up')).toBeInTheDocument();
    expect(screen.getByText(/1 Jun 2026/)).toBeInTheDocument();
    // Time display is locale/timezone-dependent — verify format rather than exact value
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
    expect(screen.getByText(/Alice Smith/)).toBeInTheDocument();
  });

  it('omits carer row when carerName is null', () => {
    hookMock.value = {
      appointment: { ...BASE_APPOINTMENT, carerName: null },
      loading: false,
      error: null,
    };
    renderWidget();
    expect(screen.queryByText(/Carer:/)).not.toBeInTheDocument();
  });
});
