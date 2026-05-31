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
  supportMessageDismissedAt: string | null;
}

export interface CreateWellbeingCheckInInput {
  sleepQuality: number;
  stressLevel: number;
  overwhelmLevel: number;
  socialConnection: number;
  overallMood: number;
}

export interface WellbeingSupportTrigger {
  checkInId: string;
  triggerWeekStart: string;
  compositeScore: number;
  averageScore: number;
}