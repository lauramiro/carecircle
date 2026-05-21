import cron from 'node-cron';
import webpush from 'web-push';
import type { PushSubscription } from 'web-push';
import { supabase } from './supabase';

const env = process['env'];

const JOB_INTERVAL   = env['REMINDER_CHECK_INTERVAL'] || '* * * * *';
const WINDOW_MINUTES = 5;

const vapidPublicKey = env['VAPID_PUBLIC_KEY'];
const vapidSecret    = env['VAPID_SECRET'];
const vapidSubject   = env['VAPID_SUBJECT'] || 'mailto:admin@carecircle.app';

if (vapidPublicKey && vapidSecret) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidSecret);
}

export function startAppointmentReminderJob() {
    console.log(`[AppointmentReminderJob] Starting with interval: ${JOB_INTERVAL}`);

    if (!vapidPublicKey || !vapidSecret) {
        console.warn('[AppointmentReminderJob] VAPID keys not configured — push notifications disabled');
        return;
    }

    cron.schedule(JOB_INTERVAL, async () => {
        try {
            await checkAndSendReminders();
        } catch (err) {
            console.error('[AppointmentReminderJob] Error:', err);
        }
    });
}

const REMINDER_WINDOWS = [
    { type: 'appointment_reminder_24h', label: '24 hours', targetMs: 24 * 60 * 60 * 1000, offsetMinutes: 1440 },
    { type: 'appointment_reminder_1h',  label: '1 hour',   targetMs:      60 * 60 * 1000, offsetMinutes:   60 },
] as const;

export async function checkAndSendReminders() {
    const now = new Date();
    console.log(`[AppointmentReminderJob] Running at ${now.toISOString()}`);

    for (const window of REMINDER_WINDOWS) {
        const windowStart = new Date(now.getTime() + window.targetMs - WINDOW_MINUTES * 60 * 1000);
        const windowEnd   = new Date(now.getTime() + window.targetMs + WINDOW_MINUTES * 60 * 1000);

        const { data: appointments, error } = await supabase
            .from('appointments')
            .select('id, title, start_time, location, attendees, reminder_offsets, patients(group_id)')
            .eq('status', 'scheduled')
            .gte('start_time', windowStart.toISOString())
            .lte('start_time', windowEnd.toISOString());

        if (error) {
            console.error(`[AppointmentReminderJob] Query failed for ${window.label} window:`, error);
            continue;
        }

        if (!appointments || appointments.length === 0) {
            console.log(`[AppointmentReminderJob] No appointments in ${window.label} window`);
            continue;
        }

        for (const appt of appointments) {
            const attendees      = (appt.attendees as string[] | null) ?? [];
            const patient        = appt.patients as { group_id: string | null } | null;
            const groupId        = patient?.group_id;
            const reminderOffsets = (appt.reminder_offsets as number[] | null) ?? [1440, 60];

            if (attendees.length === 0 || !groupId) continue;
            if (!reminderOffsets.includes(window.offsetMinutes)) continue;

            for (const userId of attendees) {
                await sendReminderToUser(userId, appt as AppointmentRow, window.type, window.label, groupId);
            }
        }
    }
}

interface AppointmentRow {
    id: string;
    title: string;
    start_time: string;
    location: string | null;
    reminder_offsets?: number[] | null;
}

async function sendReminderToUser(
    userId: string,
    appt: AppointmentRow,
    reminderType: string,
    reminderLabel: string,
    groupId: string,
) {
    const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('related_entity_id', appt.id)
        .eq('type', reminderType)
        .maybeSingle();

    if (existing) return;

    const startTime = new Date(appt.start_time);
    const dateStr   = startTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    const timeStr   = startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

    const title = `Appointment in ${reminderLabel}`;
    const body  = appt.location
        ? `${appt.title} — ${dateStr} at ${timeStr}, ${appt.location}`
        : `${appt.title} — ${dateStr} at ${timeStr}`;

    const frontendBase = (env['FRONTEND_PUBLIC_URL'] || 'http://localhost:5173').replace(/\/$/, '');
    const actionUrl    = `${frontendBase}/groups/${groupId}/appointments`;

    const { data: profile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', userId)
        .single();

    const prefs    = (profile?.preferences as Record<string, unknown> | null) ?? {};
    const pushSubs = (prefs['pushSubscriptions'] as PushSubscription[] | null) ?? [];

    await supabase.from('notifications').insert({
        user_id:             userId,
        type:                reminderType,
        title,
        body,
        action_url:          actionUrl,
        related_entity_id:   appt.id,
        related_entity_type: 'appointment',
        sent_via:            pushSubs.length > 0 ? ['push'] : [],
    });

    if (pushSubs.length === 0) {
        console.log(`[AppointmentReminderJob] No push subscriptions for user ${userId}`);
        return;
    }

    const payload = JSON.stringify({ title, body, url: actionUrl });
    const expiredEndpoints: string[] = [];

    for (const sub of pushSubs) {
        try {
            await webpush.sendNotification(sub, payload);
            console.log(`[AppointmentReminderJob] Sent ${reminderType} to user ${userId}`);
        } catch (err: unknown) {
            const status = (err as { statusCode?: number }).statusCode;
            if (status === 410 || status === 404) {
                expiredEndpoints.push(sub.endpoint);
            } else {
                console.error(`[AppointmentReminderJob] Push failed for user ${userId}:`, err);
            }
        }
    }

    if (expiredEndpoints.length > 0) {
        const validSubs = pushSubs.filter(s => !expiredEndpoints.includes(s.endpoint));
        await supabase
            .from('profiles')
            .update({ preferences: { ...prefs, pushSubscriptions: validSubs } })
            .eq('id', userId);
    }
}
