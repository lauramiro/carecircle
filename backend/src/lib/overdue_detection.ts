import cron from 'node-cron';
import { supabase } from '../lib/supabase';
import { calculateStatus } from './medication_status';

const OVERDUE_THRESHOLD_MINUTES = 30;
const JOB_INTERVAL = process.env.OVERDUE_CHECK_INTERVAL || '*/5 * * * *';

/**
 * Start the overdue detection background job
 * Runs every 5 minutes (or configured interval)
 */

export function startOverdueDetectionJob() {
    console.log(`[OverdueDetectionJob] Starting with interval: ${JOB_INTERVAL}`);

    cron.schedule(JOB_INTERVAL, async () => {
        try {
            await checkAndUpdateOverdueItems();
        } catch (err) {
            console.error(`[OverdueDetectionJob] Error:`, err);
            //Dont rethrow; job continues on next interval
        }
    });
}

/**
 * Core logic: Fetch due items, cehck if they've become overdue, update database
 */

export async function checkAndUpdateOverdueItems() {
    const now = new Date();
    console.log(`[OverdueDetectionJob] Running at ${now.toISOString()}`);

    try {
        //Step 1: Get today's Date
        const today = now.toISOString().split('T')[0];

        //Step 2: Fetch all 'due' items for today
        const { data: dueItems, error: fetchError } = await supabase
          .from('daily_medication_checklist')
          .select(`
            id,
            checklist_date,
            patient_id,
            family_id,
            created_at,
            items:checklist_items(
            id,
            medication_id,
            status,
            created_at,
            given_at,
            skip_reason,
            medications(name, dosage, dosage_unit),
            time_windows(time_of_day, window_start, window_end)
            )
        `)
        .eq('checklist_date', today)
        .eq('items.status','due');

        if (fetchError) throw fetchError;
        if (!dueItems || dueItems.length === 0) {
            console.log(`[OverdueDetectionJob]No due items found`);
            return;
        }

        //Step 3: Get family timezone preferences
        const familyIds = [...new Set(dueItems.map(c => c.family_id))];
        const { data: families, error: familyError } = await supabase
          .from('families')
          .select('id, prefered_timezone')
          .in('id', familyIds);


        if (familyError) throw familyError;
        const tzMap = Object.fromEntries(families?.map(f => [f.id, f.prefered_timezone]) || []);
        
        //Step 4: Check each item and update if it's now overdue
        const toUpdate: Array<{ id: string; status: 'overdue' }> = [];

        for (const checklist of dueItems) {
            const tz = tzMap[checklist.family_id] || 'UTC';

            for (const item of checklist.items || []) {
                const recalculatedStatus = calculateStatus(
                    {
                        id: item.id,
                        medication_id: item.medication_id,
                        medication_name: item.medications.name,
                        dosage: item.medications.dosage,
                        dosage_unit: item.medications.dosage_unit,
                        time_window: {
                            time_of_day: item.time_windows.time_of_day,
                            window_start: item.time_windows.window_start,
                            window_end: item.time_windows.window_end
                        },
                        given_at: item.given_at,
                        skip_reason: item.skip_reason,
                        created_at: checklist.created_at
                    } as any,
                    now,
                    tz
                );

                if (recalculatedStatus === 'overdue') {
                    toUpdate.push({ id: item.id, status: 'overdue' });
                }
            }
        }

        //Step 5: Batch update
        if (toUpdate.length > 0) {
            console.log(`[OverdueDetectionJob] Updating ${toUpdate.length} items to overdue`);

            for (const update of toUpdate) {
                const { error: updateError } = await supabase
                  .from('checklist_items')
                  .update({ status: 'overdue', updated_at: now.toISOString() })
                  .eq('id', update.id)

                if (updateError) {
                    console.log(`[OverdueDetectionJob] Failed to update ${update.id}:`, updateError);  
                }
            }
        }else {
            console.log(`[OverdueDetectionJob] No items crossed overdue threshold`);
        }
    } catch (err) {
        console.error(`[OverdueDetectionJob] Unexpected error:`, err);
        throw err;
    }
}