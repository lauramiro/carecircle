export interface Allergy {
  description: string;
  severity?: 'mild' | 'moderate' | 'severe';
}

export interface CareRecipient {
  id: string;
  groupId: string;
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  avatarUrl?: string;
  conditions: string[];
  allergies: Allergy[];
}
