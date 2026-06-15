export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export type RecurrenceRule = 'weekly' | 'fortnightly' | 'monthly';

export type EditScope = 'this' | 'future';

export interface Appointment {
  id: string;
  patientId: string;
  title: string;
  startTime: string;
  endTime: string;
  attendingCarerId: string | null;
  specialistName: string | null;
  specialistPhone: string | null;
  location: string | null;
  preVisitNotes: string | null;
  postVisitNotes: string | null;
  status: AppointmentStatus;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  recurrenceRule: RecurrenceRule | null;
  recurrenceSeriesId: string | null;
}

export interface AddAppointmentPayload {
  patientId: string;
  title: string;
  startTime: string;
  attendingCarerId: string;
  specialistName?: string;
  specialistPhone?: string;
  location?: string;
  preVisitNotes?: string;
  recurrenceRule?: RecurrenceRule;
}

export interface EditAppointmentPayload {
  title?: string;
  startTime?: string;
  attendingCarerId?: string;
  specialistName?: string | null;
  specialistPhone?: string | null;
  location?: string | null;
  preVisitNotes?: string | null;
  postVisitNotes?: string | null;
}
