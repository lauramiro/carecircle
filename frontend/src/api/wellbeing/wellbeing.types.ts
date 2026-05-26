export interface WellbeingCheckIn {
  id: string;
  submittedAt: string;
  weekStart: string;
  sleepQuality: number;
  stressLevel: number;
  overwhelmLevel: number;
  socialConnection: number;
  overallMood: number;
  compositeScore: number;
}

export interface CreateWellbeingCheckInInput {
  sleepQuality: number;
  stressLevel: number;
  overwhelmLevel: number;
  socialConnection: number;
  overallMood: number;
}