import type { ChecklistItem } from '@lib/checklist';

export type ChecklistItemPatch = Partial<
  Pick<
    ChecklistItem,
    | 'status'
    | 'given_at'
    | 'given_by_carer_id'
    | 'given_by_user_id'
    | 'given_notes'
    | 'overdue_hours'
    | 'overdue_minutes'
    | 'skip_reason'
    | 'skip_notes'
    | 'updated_at'
  >
>;

export interface MarkAsGivenInput {
  itemId: string;
  notes: string;
  asLate: boolean;
  overdueHours: number;
  overdueMinutes: number;
  photoFile: File | null;
}

export interface SkipChecklistItemInput {
  itemId: string;
  reason: string;
  notes: string;
}
