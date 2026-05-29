import type {
  AddAppointmentPayload,
  Appointment,
  EditAppointmentPayload,
  EditScope,
} from './appointments.types';

function makeAppt(
  overrides: Partial<Appointment> & Pick<Appointment, 'id' | 'patientId' | 'title' | 'startTime' | 'attendingCarerId'>,
): Appointment {
  return {
    endTime: overrides.startTime,
    specialistName: null,
    location: null,
    preVisitNotes: null,
    postVisitNotes: null,
    status: 'scheduled',
    createdBy: 'member-1',
    createdAt: '2026-05-01T08:00:00.000Z',
    updatedAt: '2026-05-01T08:00:00.000Z',
    recurrenceRule: null,
    recurrenceSeriesId: null,
    ...overrides,
  };
}

const mockAppointments: Appointment[] = [
  makeAppt({
    id: 'appt-001',
    patientId: 'patient-001',
    title: 'Cardiology Check-up',
    startTime: '2026-06-10T10:00:00.000Z',
    attendingCarerId: 'member-1',
    specialistName: 'Dr. Sarah Jones',
    location: 'City Hospital, Cardiology Wing',
    preVisitNotes: 'Bring last ECG results.',
  }),
  makeAppt({
    id: 'appt-002',
    patientId: 'patient-001',
    title: 'Blood Test',
    startTime: '2026-05-20T08:30:00.000Z',
    attendingCarerId: 'member-2',
    location: 'Northside Clinic',
  }),
  makeAppt({
    id: 'appt-003',
    patientId: 'patient-001',
    title: 'GP Annual Review',
    startTime: '2026-04-15T09:00:00.000Z',
    attendingCarerId: 'member-1',
    specialistName: 'Dr. Helen Carter',
    status: 'completed',
    postVisitNotes: 'Blood pressure slightly elevated. Follow up in 3 months.',
  }),
  makeAppt({
    id: 'appt-004',
    patientId: 'patient-002',
    title: 'Post-Surgery Follow-up',
    startTime: '2026-06-03T14:00:00.000Z',
    attendingCarerId: 'member-4',
    specialistName: 'Dr. Aisha Morgan',
    location: 'Riverside Health Clinic',
    preVisitNotes: 'Bring discharge summary.',
  }),
];

function delay<T>(value: T, timeoutMs = 250): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), timeoutMs);
  });
}

export async function getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
  return delay(
    mockAppointments
      .filter((a) => a.patientId === patientId && a.status !== 'cancelled')
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  );
}

export async function addAppointment(payload: AddAppointmentPayload): Promise<Appointment> {
  const now = new Date().toISOString();
  const appt: Appointment = {
    id: `appt-${Date.now()}`,
    patientId: payload.patientId,
    title: payload.title,
    startTime: payload.startTime,
    endTime: payload.startTime,
    attendingCarerId: payload.attendingCarerId,
    specialistName: payload.specialistName ?? null,
    location: payload.location ?? null,
    preVisitNotes: payload.preVisitNotes ?? null,
    postVisitNotes: null,
    status: 'scheduled',
    createdBy: null,
    createdAt: now,
    updatedAt: now,
    recurrenceRule: payload.recurrenceRule ?? null,
    recurrenceSeriesId: payload.recurrenceRule ? `series-${Date.now()}` : null,
  };
  mockAppointments.push(appt);
  return delay({ ...appt });
}

export async function editAppointment(
  id: string,
  changes: EditAppointmentPayload,
  _scope: EditScope = 'this',
): Promise<Appointment> {
  const appt = mockAppointments.find((a) => a.id === id);
  if (!appt) throw new Error(`Appointment ${id} not found`);

  if (changes.title !== undefined) appt.title = changes.title;
  if (changes.startTime !== undefined) { appt.startTime = changes.startTime; appt.endTime = changes.startTime; }
  if (changes.attendingCarerId !== undefined) appt.attendingCarerId = changes.attendingCarerId;
  if (changes.specialistName !== undefined) appt.specialistName = changes.specialistName;
  if (changes.location !== undefined) appt.location = changes.location;
  if (changes.preVisitNotes !== undefined) appt.preVisitNotes = changes.preVisitNotes;
  if (changes.postVisitNotes !== undefined) appt.postVisitNotes = changes.postVisitNotes;
  appt.updatedAt = new Date().toISOString();

  return delay({ ...appt });
}

export async function deleteAppointment(
  id: string,
  _scope: EditScope = 'this',
): Promise<void> {
  const appt = mockAppointments.find((a) => a.id === id);
  if (!appt) throw new Error(`Appointment ${id} not found`);
  appt.status = 'cancelled';
  return delay(undefined);
}
