import { supabase } from '../lib/supabase';
import { formatInTimeZone } from 'date-fns-tz';

export interface ChecklistGenerationResult {
  success: boolean;
  familiesProcessed: number;
  checklistsCreated: number;
  itemsCreated: number;
  errors: string[];
}

/**
 * CC-66: Main entry point - runs every minute to detect midnight crossings
 */
export async function generateChecklistsForMidnightFamilies(): Promise<ChecklistGenerationResult> {
  const result: ChecklistGenerationResult = {
    success: true,
    familiesProcessed: 0,
    checklistsCreated: 0,
    itemsCreated: 0,
    errors: []
  };

  try {
    // Fetch all active families with their timezone
    const { data: families, error: familiesError } = await supabase
      .from('families')
      .select('id, preferred_timezone');

    if (familiesError) throw familiesError;
    if (!families || families.length === 0) {
      console.log('[ChecklistGeneration] No families found');
      return result;
    }

    const now = new Date();

    for (const family of families) {
      try {
        result.familiesProcessed++;

        const tz = family.preferred_timezone ?? 'UTC';

        // Get local time for this family
        const familyLocalTime = formatInTimeZone(now, tz, 'HH:mm:ss');
        const familyLocalDate = formatInTimeZone(now, tz, 'yyyy-MM-dd');

        const [localHour, localMin] = familyLocalTime.split(':').map(Number);

        // Check if midnight just occurred (between 00:00 and 00:30)
        if (localHour === 0 && localMin < 30) {
          const { checklistsCreated, itemsCreated } =
            await generateChecklistForFamily(family.id, familyLocalDate);

          result.checklistsCreated += checklistsCreated;
          result.itemsCreated += itemsCreated;
        }
      } catch (err) {
        result.errors.push(`Family ${family.id}: ${(err as Error).message}`);
        result.success = false;
      }
    }
  } catch (err) {
    result.errors.push(`Global error: ${(err as Error).message}`);
    result.success = false;
  }

  return result;
}

/**
 * Generate checklist for a specific family on a specific date
 * Uses the stored procedure Peter created
 */
async function generateChecklistForFamily(
  familyId: string,
  localDate: string,
): Promise<{ checklistsCreated: number; itemsCreated: number }> {

  const { data, error } = await supabase.rpc('create_daily_checklists_for_family', {
    p_family_id: familyId,
    p_checklist_date: localDate,
  });

  if (error) {
    console.error(`[ChecklistGeneration] RPC error for family ${familyId}:`, error);
    throw error;
  }

  const result = data?.[0];
  
  if (result?.error_message) {
    console.error(`[ChecklistGeneration] Stored procedure error:`, result.error_message);
    throw new Error(result.error_message);
  }

  console.log(
    `[ChecklistGeneration] Family ${familyId} on ${localDate}: ` +
    `${result?.checklists_created ?? 0} checklists, ${result?.items_created ?? 0} items`
  );

  return {
    checklistsCreated: result?.checklists_created ?? 0,
    itemsCreated: result?.items_created ?? 0,
  };
}