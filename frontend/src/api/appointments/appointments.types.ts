export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  patientId: string;
  title: string;
  startTime: string;
  endTime: string;
  attendingCarerId: string | null;
  specialistName: string | null;
  location: string | null;
  preVisitNotes: string | null;
  postVisitNotes: string | null;
  status: AppointmentStatus;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AddAppointmentPayload {
  patientId: string;
  title: string;
  startTime: string;
  attendingCarerId: string;
  specialistName?: string;
  location?: string;
  preVisitNotes?: string;
}

export interface EditAppointmentPayload {
  title?: string;
  startTime?: string;
  attendingCarerId?: string;
  specialistName?: string | null;
  location?: string | null;
  preVisitNotes?: string | null;
  postVisitNotes?: string | null;
}
