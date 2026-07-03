import type { Database } from './database.types';

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type ChecklistItemRow = Tables<'checklist_items'>;
export type ChecklistItemInsert = TablesInsert<'checklist_items'>;
export type ChecklistItemUpdate = TablesUpdate<'checklist_items'>;
export type DailyChecklistRow = Tables<'daily_medication_checklists'>;
export type DailyChecklistInsert = TablesInsert<'daily_medication_checklists'>;
export type MedicationRow = Tables<'medications'>;
export type WeeklyShiftAssignmentRow = Tables<'weekly_shift_assignments'>;
export type PatientInsert = TablesInsert<'patients'>;
export type CareGroupInsert = TablesInsert<'care_group'>;
export type CareGiverInsert = TablesInsert<'care_givers'>;
export type ProfileInsert = TablesInsert<'profiles'>;
export type GPContactRow = Tables<'gp_contacts'>;
export type GPContactInsert = TablesInsert<'gp_contacts'>;
export type GPContactUpdate = TablesUpdate<'gp_contacts'>;
export type EmergencyContactRow = Tables<'emergency_contacts'>;
export type EmergencyContactInsert = TablesInsert<'emergency_contacts'>;
export type EmergencyContactUpdate = TablesUpdate<'emergency_contacts'>;
