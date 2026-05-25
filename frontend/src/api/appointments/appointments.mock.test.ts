import { describe, it, expect } from 'vitest';
import * as mock from './appointments.mock';
import type { AddAppointmentPayload } from './appointments.types';

const BASE_PAYLOAD: AddAppointmentPayload = {
  patientId: 'test-patient',
  title: 'GP Check-up',
  startTime: '2026-07-01T10:00:00.000Z',
  attendingCarerId: 'carer-1',
};

async function seedAppointment(overrides: Partial<AddAppointmentPayload> = {}): Promise<string> {
  const appt = await mock.addAppointment({ ...BASE_PAYLOAD, ...overrides });
  return appt.id;
}

describe('appointments mock', () => {
  it('addAppointment returns an appointment with the correct fields', async () => {
    const appt = await mock.addAppointment(BASE_PAYLOAD);

    expect(appt.patientId).toBe(BASE_PAYLOAD.patientId);
    expect(appt.title).toBe(BASE_PAYLOAD.title);
    expect(appt.startTime).toBe(BASE_PAYLOAD.startTime);
    expect(appt.endTime).toBe(BASE_PAYLOAD.startTime);
    expect(appt.attendingCarerId).toBe(BASE_PAYLOAD.attendingCarerId);
    expect(appt.status).toBe('scheduled');
    expect(appt.postVisitNotes).toBeNull();
  });

  it('addAppointment stores optional fields when provided', async () => {
    const appt = await mock.addAppointment({
      ...BASE_PAYLOAD,
      specialistName: 'Dr. Smith',
      location: 'City Hospital',
      preVisitNotes: 'Bring blood test results.',
    });

    expect(appt.specialistName).toBe('Dr. Smith');
    expect(appt.location).toBe('City Hospital');
    expect(appt.preVisitNotes).toBe('Bring blood test results.');
  });

  it('addAppointment sets optional fields to null when omitted', async () => {
    const appt = await mock.addAppointment(BASE_PAYLOAD);

    expect(appt.specialistName).toBeNull();
    expect(appt.location).toBeNull();
    expect(appt.preVisitNotes).toBeNull();
  });

  it('getAppointmentsByPatient returns only matching patient appointments', async () => {
    const patientId = `patient-filter-${Date.now()}`;
    const other = `patient-other-${Date.now()}`;
    await mock.addAppointment({ ...BASE_PAYLOAD, patientId });
    await mock.addAppointment({ ...BASE_PAYLOAD, patientId: other });

    const results = await mock.getAppointmentsByPatient(patientId);
    expect(results.every((a) => a.patientId === patientId)).toBe(true);
  });

  it('getAppointmentsByPatient returns an empty array for a patient with no appointments', async () => {
    const results = await mock.getAppointmentsByPatient(`patient-none-${Date.now()}`);
    expect(results).toEqual([]);
  });

  it('getAppointmentsByPatient excludes cancelled appointments', async () => {
    const patientId = `patient-cancelled-${Date.now()}`;
    const id = await seedAppointment({ patientId });
    await mock.deleteAppointment(id);

    const results = await mock.getAppointmentsByPatient(patientId);
    expect(results.some((a) => a.id === id)).toBe(false);
  });

  it('getAppointmentsByPatient returns results sorted by startTime ascending', async () => {
    const patientId = `patient-sort-${Date.now()}`;
    await mock.addAppointment({ ...BASE_PAYLOAD, patientId, startTime: '2026-09-01T09:00:00.000Z' });
    await mock.addAppointment({ ...BASE_PAYLOAD, patientId, startTime: '2026-07-01T09:00:00.000Z' });
    await mock.addAppointment({ ...BASE_PAYLOAD, patientId, startTime: '2026-08-01T09:00:00.000Z' });

    const results = await mock.getAppointmentsByPatient(patientId);
    const times = results.map((a) => a.startTime);
    expect(times).toEqual([...times].sort());
  });

  it('editAppointment updates the title', async () => {
    const id = await seedAppointment();
    const updated = await mock.editAppointment(id, { title: 'Revised Title' });

    expect(updated.title).toBe('Revised Title');
  });

  it('editAppointment updates startTime and keeps endTime in sync', async () => {
    const id = await seedAppointment();
    const newTime = '2026-09-15T14:00:00.000Z';
    const updated = await mock.editAppointment(id, { startTime: newTime });

    expect(updated.startTime).toBe(newTime);
    expect(updated.endTime).toBe(newTime);
  });

  it('editAppointment can set postVisitNotes', async () => {
    const id = await seedAppointment();
    const updated = await mock.editAppointment(id, { postVisitNotes: 'All went well.' });

    expect(updated.postVisitNotes).toBe('All went well.');
  });

  it('editAppointment can clear optional fields to null', async () => {
    const id = await seedAppointment({ specialistName: 'Dr. Jones', location: 'Clinic A' });
    const updated = await mock.editAppointment(id, { specialistName: null, location: null });

    expect(updated.specialistName).toBeNull();
    expect(updated.location).toBeNull();
  });

  it('editAppointment preserves fields not included in changes', async () => {
    const id = await seedAppointment({ specialistName: 'Dr. Jones', location: 'Ward 3' });
    const updated = await mock.editAppointment(id, { title: 'New Title' });

    expect(updated.specialistName).toBe('Dr. Jones');
    expect(updated.location).toBe('Ward 3');
  });

  it('editAppointment throws when the id does not exist', async () => {
    await expect(mock.editAppointment('non-existent-id', { title: 'X' })).rejects.toThrow(
      'Appointment non-existent-id not found',
    );
  });

  it('deleteAppointment sets status to cancelled', async () => {
    const patientId = `patient-del-${Date.now()}`;
    const id = await seedAppointment({ patientId });
    await mock.deleteAppointment(id);

    const results = await mock.getAppointmentsByPatient(patientId);
    expect(results.some((a) => a.id === id)).toBe(false);
  });

  it('deleteAppointment throws when the id does not exist', async () => {
    await expect(mock.deleteAppointment('non-existent-id')).rejects.toThrow(
      'Appointment non-existent-id not found',
    );
  });
});
