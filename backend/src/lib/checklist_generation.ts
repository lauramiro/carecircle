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
    // Fetch all active families
    const { data: families, error: familyError } = await supabase
      .from('families')
      .select('id, name, preferred_timezone')
      .eq('is_active', true);
 
    if (familyError) throw familyError;
    if (!families || families.length === 0) {
      console.log('[ChecklistGeneration] No families found');
      return result;
    }
 
    const now = new Date();
 
    for (const family of families) {
      try {
        result.familiesProcessed++;
 
        // Get local time for this family
        const familyLocalTime = formatInTimeZone(now, family.preferred_timezone, 'HH:mm:ss');
        const familyLocalDate = formatInTimeZone(now, family.preferred_timezone, 'yyyy-MM-dd');
 
        const [localHour, localMin] = familyLocalTime.split(':').map(Number);
 
        // Check if midnight just occurred (between 00:00 and 00:30)
        if (localHour === 0 && localMin < 30) {
          const { checklistsCreated: created, itemsCreated: items } = 
            await generateChecklistForFamily(family.id, familyLocalDate, family.preferred_timezone);
 
          result.checklistsCreated += created;
          result.itemsCreated += items;
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
 */
async function generateChecklistForFamily(
  familyId: string,
  localDate: string,
  timezone: string
): Promise<{ checklistsCreated: number; itemsCreated: number }> {
  let checklistsCreated = 0;
  let itemsCreated = 0;
 
  // Check if checklist already exists (idempotency)
  const { data: existingChecklists, error: checkError } = await supabase
    .from('daily_medication_checklists')
    .select('id')
    .eq('family_id', familyId)
    .eq('checklist_date', localDate)
    .limit(1);
 
  if (checkError) throw checkError;
  if (existingChecklists && existingChecklists.length > 0) {
    console.log(`[ChecklistGeneration] Checklist already exists for ${familyId} on ${localDate}`);
    return { checklistsCreated: 0, itemsCreated: 0 };
  }
 
  // Get all patients in family
  const { data: members, error: memberError } = await supabase
    .from('family_members')
    .select('patient_id')
    .eq('family_id', familyId);
 
  if (memberError) throw memberError;
  if (!members || members.length === 0) {
    console.log(`[ChecklistGeneration] No patients found for family ${familyId}`);
    return { checklistsCreated: 0, itemsCreated: 0 };
  }
 
  const patientIds = members.map(m => m.patient_id);
 
  // Get active medication schedules
  const dayOfWeek = getDayOfWeek(localDate);
  const { data: schedules, error: scheduleError } = await supabase
    .from('medication_schedules')
    .select(`
      id,
      medication_id,
      patient_id,
      time_of_day,
      window_start,
      window_end,
      medications(id, name, dosage, dosage_unit, active_flag)
    `)
    .in('patient_id', patientIds)
    .eq('medications.active_flag', true)
    .filter('days_of_week', 'ilike', `%${dayOfWeek}%`);
 
  if (scheduleError) throw scheduleError;
  if (!schedules || schedules.length === 0) {
    console.log(`[ChecklistGeneration] No schedules for ${familyId} on ${localDate}`);
    return { checklistsCreated: 0, itemsCreated: 0 };
  }
 
  // Group by patient
  const schedulesByPatient = groupBy(schedules, 'patient_id');
 
  for (const [patientId, patientSchedules] of Object.entries(schedulesByPatient)) {
    // Create checklist record
    const { data: createdChecklist, error: checklistCreateError } = await supabase
      .from('daily_medication_checklists')
      .insert([
        {
          family_id: familyId,
          patient_id: patientId,
          checklist_date: localDate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select('id')
      .single();
 
    if (checklistCreateError) throw checklistCreateError;
    if (!createdChecklist) throw new Error('Failed to create checklist');
 
    checklistsCreated++;
 
    // Create checklist items
    const itemsForChecklist = (patientSchedules as any[]).map(schedule => ({
      checklist_id: createdChecklist.id,
      medication_id: schedule.medication_id,
      time_of_day: schedule.time_of_day,
      window_start: schedule.window_start,
      window_end: schedule.window_end,
      status: 'due' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
 
    const { error: itemError, count } = await supabase
      .from('checklist_items')
      .insert(itemsForChecklist);
 
    if (itemError) throw itemError;
    itemsCreated += itemsForChecklist.length;
 
    console.log(`[ChecklistGeneration] Created ${itemsForChecklist.length} items for patient ${patientId}`);
  }
 
  return { checklistsCreated, itemsCreated };
}
 
function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00Z');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getUTCDay()];
}
 
function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, obj) => {
    const k = String(obj[key]);
    if (!acc[k]) acc[k] = [];
    acc[k].push(obj);
    return acc;
  }, {} as Record<string, T[]>);
}