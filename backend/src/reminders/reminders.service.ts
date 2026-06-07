import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AppConfigService } from '../config/app-config.service';
import { PushDispatchService } from '../alerts/push-dispatch.service';
import { GmailMailerService } from '../email/gmail-mailer.service';
import { SupabaseAdminClient } from '../integrations/supabase-admin.client';

const REMINDER_OFFSETS_MINUTES = [1440, 60] as const; // 24 h, 1 h
const WINDOW_MINUTES = 5; // cron runs every 5 min; look ±5 min around each target

interface AppointmentRow {
  id: string;
  title: string;
  start_time: string;
  location: string | null;
  attendees: string[] | null;
  patient_id: string;
  reminder_offsets: number[];
}

interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
}

interface PatientRow {
  group_id: string;
}

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly pushDispatch: PushDispatchService,
    private readonly mailer: GmailMailerService,
    private readonly appConfig: AppConfigService,
    private readonly supabase: SupabaseAdminClient,
  ) {}

  @Cron('*/5 * * * *')
  async runReminderCheck(): Promise<void> {
    if (!this.appConfig.cronsEnabled) return;
    if (!this.supabase.isEnabled()) {
      this.logger.warn(
        'reminders_cron_skipped: supabase service role not configured',
      );
      return;
    }
    const now = new Date();
    for (const offsetMinutes of REMINDER_OFFSETS_MINUTES) {
      await this.processOffset(now, offsetMinutes).catch((err) =>
        this.logger.warn(
          `reminders_offset_failed offset=${offsetMinutes}`,
          err,
        ),
      );
    }
  }

  private async processOffset(now: Date, offsetMinutes: number): Promise<void> {
    const db = this.supabase.getClient();
    const targetTime = new Date(now.getTime() + offsetMinutes * 60_000);
    const windowStart = new Date(
      targetTime.getTime() - WINDOW_MINUTES * 60_000,
    );
    const windowEnd = new Date(targetTime.getTime() + WINDOW_MINUTES * 60_000);

    const { data, error } = await db
      .from('appointments')
      .select(
        'id, title, start_time, location, attendees, patient_id, reminder_offsets',
      )
      .gte('start_time', windowStart.toISOString())
      .lte('start_time', windowEnd.toISOString())
      .not('status', 'in', '("cancelled","completed","no_show")')
      .gt('start_time', now.toISOString());

    if (error) {
      this.logger.error(
        `reminders_query_failed offset=${offsetMinutes} ${error.message}`,
      );
      return;
    }

    const pending = ((data ?? []) as AppointmentRow[]).filter(
      (a) =>
        !((a.reminder_offsets ?? []) as number[]).includes(offsetMinutes),
    );

    if (!pending.length) return;
    this.logger.log(
      `reminders_pending offset=${offsetMinutes} count=${pending.length}`,
    );

    await Promise.all(
      pending.map((a) => this.dispatchReminder(a, offsetMinutes)),
    );
  }

  private async dispatchReminder(
    appt: AppointmentRow,
    offsetMinutes: number,
  ): Promise<void> {
    const db = this.supabase.getClient();
    const attendeeIds = appt.attendees ?? [];
    if (!attendeeIds.length) {
      this.logger.warn(`reminders_no_attendees appt=${appt.id}`);
      return;
    }

    const [profiles, patient] = await Promise.all([
      this.fetchProfiles(attendeeIds),
      this.fetchPatient(appt.patient_id),
    ]);

    const groupId = patient?.group_id;
    const frontendUrl = (
      this.appConfig.config.FRONTEND_PUBLIC_URL ?? 'http://localhost:5173'
    ).replace(/\/$/, '');
    const deepLinkUrl = groupId
      ? `${frontendUrl}/groups/${groupId}/appointments?apptId=${appt.id}`
      : frontendUrl;

    const label = offsetMinutes >= 1440 ? '24 hours' : '1 hour';
    const apptDate = new Date(appt.start_time);
    const dateStr = apptDate.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeStr = apptDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const locationStr = appt.location ? ` at ${appt.location}` : '';

    const title = `Reminder: ${appt.title}`;
    const body = `${appt.title} is in ${label} — ${dateStr}, ${timeStr}${locationStr}`;

    await Promise.all(
      profiles.map((profile) =>
        this.notifyUser(profile, title, body, deepLinkUrl, appt.id),
      ),
    );

    const { error } = await db
      .from('appointments')
      .update({
        reminder_offsets: [
          ...(appt.reminder_offsets ?? []),
          offsetMinutes,
        ],
      })
      .eq('id', appt.id);

    if (error) {
      this.logger.error(
        `reminders_mark_sent_failed appt=${appt.id} ${error.message}`,
      );
    } else {
      this.logger.log(`reminders_sent appt=${appt.id} offset=${offsetMinutes}`);
    }
  }

  private async notifyUser(
    profile: ProfileRow,
    title: string,
    body: string,
    url: string,
    appointmentId: string,
  ): Promise<void> {
    const db = this.supabase.getClient();
    const channelsSent: string[] = [];

    // In-app notification
    const { error: notifError } = await db.from('notifications').insert({
      user_id: profile.id,
      type: 'appointment_reminder',
      title,
      body,
      action_url: url,
      related_entity_type: 'appointment',
      related_entity_id: appointmentId,
    });
    if (notifError) {
      this.logger.warn(
        `in_app_notification_failed user=${profile.id} ${notifError.message}`,
      );
    } else {
      channelsSent.push('in_app');
    }

    // Web push
    await this.pushDispatch
      .sendToUsers([profile.id], { title, body, url })
      .catch(() => {});
    channelsSent.push('push');

    // Email (best-effort)
    if (this.mailer.isConfigured() && profile.email) {
      await this.mailer
        .sendMail({
          to: profile.email,
          subject: title,
          text: `${body}\n\nView appointment: ${url}`,
          html: `<p>${body}</p><p><a href="${url}">View appointment</a></p>`,
        })
        .then(() => channelsSent.push('email'))
        .catch(() =>
          this.logger.warn(`reminder_email_failed user=${profile.id}`),
        );
    }

    this.logger.log(
      `reminder_dispatched user=${profile.id} channels=${channelsSent.join(',')}`,
    );
  }

  private async fetchProfiles(userIds: string[]): Promise<ProfileRow[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);
    if (error) {
      this.logger.warn(`fetch_profiles_failed ${error.message}`);
      return [];
    }
    return (data ?? []) as ProfileRow[];
  }

  private async fetchPatient(patientId: string): Promise<PatientRow | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('patients')
      .select('group_id')
      .eq('id', patientId)
      .maybeSingle();
    if (error) {
      this.logger.warn(
        `fetch_patient_failed patient=${patientId} ${error.message}`,
      );
      return null;
    }
    return data as PatientRow | null;
  }
}
