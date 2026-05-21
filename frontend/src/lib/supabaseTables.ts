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
