import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { differenceInMinutes } from 'date-fns';

export type MedicationStatus = 'due' | 'given' | 'overdue' | 'skipped';

export interface TimeWindow {
    time_of_day: string;
    window_start: string;
    window_end: string;
}

export interface ChecklistItem {
    id: string;
    medication_id: string;
    medication_name: string;
    dosage: string;
    dosage_unit: string;
    time_window: TimeWindow;
    status: MedicationStatus;
    given_at?: string | null;
    given_by_user_id?: string | null;
    skip_reason?: string | null; //'not_available' | 'refused' | 'administered_elsewhere' | "other"
    skip_notes?: string | null;
    created_at: string;
    updated_at: string;

}

export function calculateStatus (
    item: Omit<ChecklistItem, 'status'>,
    now:  Date | string,
    userTimeZone: string
): MedicationStatus {
    const nowDate = typeof now === 'string' ? new Date(now) : now;

    //Terminal state 1 : Already marked as given
    if (item.given_at) {
        return 'given'
    }

    //Terminal state 2: Already marked as skipped
    if (item.skip_reason) {
        return 'skipped';
    }

    //Get the local data from when the checklist was created
    const createdLocalDate = formatInTimeZone(
        new Date(item.created_at),
        userTimeZone,
        'yyyy-MM-dd'
    );

    //Parse window times (HH:mm) as full timestamps on the checklist date
    const windowStartStr = `${createdLocalDate}T${item.time_window.window_start}:00`;
    const windowEndStr = `${createdLocalDate}T${item.time_window.window_end}:00`;

    //Convert to absolute Date objects accouting for Timezone
    const windowStartDate = fromZonedTime(windowStartStr, userTimeZone);
    const windowEndDate = fromZonedTime(windowEndStr, userTimeZone);

    //Calculate minutes since window opened
    const minutesSinceWindowOpen = differenceInMinutes(nowDate, windowStartDate);

    //Logic: 30+ minutes past window open → overdue
    if (minutesSinceWindowOpen >= 30) {
        return 'overdue';
    }

    //Logic: Otherwise →due (before window close or before it opens)
    return 'due';
}

/**
 * Batch calculate statuses for multiple items
 *
 */

export function calculateChecklistStatuses (
    items: Omit<ChecklistItem, 'status'>[],
    now: Date | string,
    userTimezone: string
): ChecklistItem[] {
    return items.map(item => ({
        ...item,
        status: calculateStatus(item, now, userTimezone)
    }));
}

/**
 * Generate a summart of checklist statuses
 * 
 */
 
export function summarizeChecklist(items: ChecklistItem[]) {
    return {
        total: items.length,
        due: items.filter(i => i.status === 'due').length,
        given: items.filter(i => i.status === 'given').length,
        overdue: items.filter(i => i.status === 'overdue').length,
        skipped: items.filter(i => i.status === 'skipped').length,
        remaining: items.filter(i => i.status === 'due' || i.status === 'overdue').length

    };

}
