export interface Allergy {
  description: string;
  severity?: 'mild' | 'moderate' | 'severe';
}

export interface Patient {
  id: string;
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  avatarUrl?: string;
  chronicConditions: string[];
  allergies: string[];
}
