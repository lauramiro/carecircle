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
  /** Minutes before appointment to send reminders, e.g. [1440, 60] = 24 h + 1 h. Empty array = no reminders. */
  reminderOffsets: number[];
}

export interface AddAppointmentPayload {
  patientId: string;
  title: string;
  startTime: string;
  attendingCarerId: string;
  specialistName?: string;
  location?: string;
  preVisitNotes?: string;
  reminderOffsets?: number[];
}

export interface EditAppointmentPayload {
  title?: string;
  startTime?: string;
  attendingCarerId?: string;
  specialistName?: string | null;
  location?: string | null;
  preVisitNotes?: string | null;
  postVisitNotes?: string | null;
  reminderOffsets?: number[];
}
