export type WellbeingAppetite = 'good' | 'fair' | 'poor';
export type WellbeingMobility = 'normal' | 'reduced' | 'very_limited';

export interface WellbeingCheckin {
  id: string;
  patientId: string;
  groupId: string;
  caregiverId: string;
  createdAt: string;
  updatedAt: string;
  checkinDate: string;
  mood: number;
  appetite: WellbeingAppetite;
  mobility: WellbeingMobility;
  painLevel: number;
  notes: string | null;
}

export interface UpsertCheckinPayload {
  patientId: string;
  groupId: string;
  caregiverId: string;
  checkinDate: string;
  mood: number;
  appetite: WellbeingAppetite;
  mobility: WellbeingMobility;
  painLevel: number;
  notes: string | null;
}
