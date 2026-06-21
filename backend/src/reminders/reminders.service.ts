/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unused-vars */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { addDays, format } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { AppConfigService } from '../config/app-config.service';
import { PushDispatchService } from '../alerts/push-dispatch.service';
import { GmailMailerService } from '../email/gmail-mailer.service';
import { SupabaseAdminClient } from '../integrations/supabase-admin.client';

const REMINDER_OFFSETS_MINUTES = [1440, 60] as const; // 24 h, 1 h
const WINDOW_MINUTES = 5; // cron runs every 5 min; look ±5 min around each target
const WELLBEING_REMINDER_TYPE = 'wellbeing_checkin_reminder';
const WELLBEING_REMINDER_TITLE = 'Weekly wellbeing check-in';
const WELLBEING_REMINDER_BODY =
  'How are you doing this week? Take 2 minutes for your wellbeing check-in';
const PATIENT_WELLBEING_NUDGE_TYPE = 'patient_wellbeing_checkin_nudge';
const PATIENT_WELLBEING_NUDGE_TITLE = 'Daily wellbeing check-in';
const SHIFT_REMINDER_TYPE = 'shift_reminder';
const EVENING_SHIFT_SLOT = 'evening';

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

interface PrimaryCarerMembershipRow {
  caregiver_id: string;
  group_id: string;
}

interface ProfilePreferenceRow {
  id: string;
  preferences: Record<string, unknown> | null;
}

interface CareGroupTimezoneRow {
  id: string;
  preferred_timezone: string | null;
}

interface GroupPatientRow {
  id: string;
  full_name: string;
  group_id: string | null;
}

interface EveningShiftAssignmentRow {
  assigned_caregiver_id: string | null;
}

interface UpcomingShiftRow {
  group_id: string;
  shift_slot: string;
  assigned_caregiver_id: string;
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
    await this.runReminderCheckAt(new Date());
  }

  async runReminderCheckAt(now: Date): Promise<void> {
    if (!this.appConfig.cronsEnabled) return;
    if (!this.supabase.isEnabled()) {
      this.logger.warn(
        'reminders_cron_skipped: supabase service role not configured',
      );
      return;
    }
    for (const offsetMinutes of REMINDER_OFFSETS_MINUTES) {
      await this.processOffset(now, offsetMinutes).catch((err) =>
        this.logger.warn(
          `reminders_offset_failed offset=${offsetMinutes}`,
          err,
        ),
      );
    }
    await this.processWeeklyWellbeingReminders(now).catch((err) =>
      this.logger.warn('wellbeing_reminders_failed', err),
    );
    await this.processEveningPatientWellbeingNudges(now).catch((err) =>
      this.logger.warn('patient_wellbeing_nudges_failed', err),
    );
    await this.processUpcomingShiftReminders(now).catch((err) =>
      this.logger.warn('upcoming_shift_reminders_failed', err),
    );
  }

  private async processUpcomingShiftReminders(now: Date): Promise<void> {
    const memberships = await this.fetchPrimaryCarerMemberships();
    if (!memberships.length) return;

    const groupIds = [...new Set(memberships.map((membership) => membership.group_id))];
    const groupTimezones = await this.fetchCareGroupTimezones(groupIds);

    const timezoneByGroupId = new Map(
      groupTimezones.map((group) => [group.id, group.preferred_timezone ?? 'UTC']),
    );

    // Hardcode predefined shift boundaries
    const shiftBounds = [
      { slot: 'morning', hour: 8 },
      { slot: 'afternoon', hour: 12 },
      { slot: 'evening', hour: 16 },
      { slot: 'overnight', hour: 20 },
    ];

    for (const group of groupTimezones) {
      const timezone = group.preferred_timezone ?? 'UTC';

      for (const bound of shiftBounds) {
        // We want to trigger exactly 2 hours BEFORE the shift starts.
        // So target start time = (bound.hour)
        // target reminder time = (bound.hour - 2)
        const reminderHour = bound.hour - 2;
        if (!this.isWithinDailyReminderWindow(now, timezone, reminderHour, 0)) {
          continue;
        }

        const shiftDate = this.getLocalDateForTimezone(now, timezone);
        
        await this.dispatchShiftReminderForGroup(group.id, shiftDate, bound.slot);
      }
    }
  }

  private async dispatchShiftReminderForGroup(groupId: string, shiftDate: string, shiftSlot: string): Promise<void> {
    const { data: assignment, error } = await this.supabase
      .getClient()
      .from('weekly_shift_assignments')
      .select('assigned_caregiver_id')
      .eq('group_id', groupId)
      .eq('shift_date', shiftDate)
      .eq('shift_slot', shiftSlot)
      .maybeSingle();

    if (error || !assignment || !assignment.assigned_caregiver_id) {
      return;
    }

    const assignedCaregiverId = assignment.assigned_caregiver_id;
    const reminderKey = `${groupId}:${shiftDate}:${shiftSlot}`;

    const alreadySent = await this.hasExistingNotification(
      assignedCaregiverId,
      SHIFT_REMINDER_TYPE,
      reminderKey,
    );

    if (alreadySent) return;

    const patient = await this.fetchPatientForGroup(groupId);
    const patientName = patient ? patient.full_name : 'the patient';
    const title = 'Upcoming Shift';
    const body = `Your ${shiftSlot} shift for ${patientName} starts in 2 hours`;

    const frontendUrl = (this.appConfig.config.FRONTEND_PUBLIC_URL ?? 'http://localhost:5173').replace(/\/$/, '');
    const actionUrl = `${frontendUrl}/groups/${groupId}/schedule`;

    const { error: notifError } = await this.supabase.getClient().from('notifications').insert({
      user_id: assignedCaregiverId,
      type: SHIFT_REMINDER_TYPE,
      title,
      body,
      action_url: actionUrl,
      related_entity_type: 'weekly_shift_assignment',
      related_entity_id: reminderKey,
      sent_via: ['push'],
    });

    if (notifError) {
      this.logger.warn(`insert_shift_reminder_failed user=${assignedCaregiverId} ${notifError.message}`);
      return;
    }

    await this.pushDispatch
      .sendToUsers([assignedCaregiverId], {
        title,
        body,
        url: actionUrl,
      })
      .catch((err) => this.logger.warn(`shift_reminder_push_failed user=${assignedCaregiverId}`, err));
  }

  private async processWeeklyWellbeingReminders(now: Date): Promise<void> {
    const memberships = await this.fetchPrimaryCarerMemberships();
    if (!memberships.length) return;

    const groupIds = [
      ...new Set(memberships.map((membership) => membership.group_id)),
    ];
    const caregiverIds = [
      ...new Set(memberships.map((membership) => membership.caregiver_id)),
    ];

    const [groupTimezones, profiles] = await Promise.all([
      this.fetchCareGroupTimezones(groupIds),
      this.fetchProfilePreferences(caregiverIds),
    ]);

    const timezoneByGroupId = new Map(
      groupTimezones.map((group) => [
        group.id,
        group.preferred_timezone ?? 'UTC',
      ]),
    );
    const profileById = new Map(
      profiles.map((profile) => [profile.id, profile]),
    );

    for (const membership of memberships) {
      const timezone = timezoneByGroupId.get(membership.group_id) ?? 'UTC';
      const profile = profileById.get(membership.caregiver_id);

      if (!this.isWeeklyWellbeingReminderEnabled(profile?.preferences)) {
        continue;
      }

      const weekStart = this.getCurrentWeekStartForTimezone(now, timezone);
      if (!this.isWithinWeeklyReminderWindow(now, timezone, weekStart)) {
        continue;
      }

      const reminderKey = `${membership.caregiver_id}:${weekStart}`;
      const alreadySent = await this.hasExistingNotification(
        membership.caregiver_id,
        WELLBEING_REMINDER_TYPE,
        reminderKey,
      );
      if (alreadySent) {
        continue;
      }

      const alreadySubmitted = await this.hasCurrentWeekWellbeingCheckIn(
        membership.caregiver_id,
        weekStart,
      );
      if (alreadySubmitted) {
        continue;
      }

      await this.sendWeeklyWellbeingReminder(
        membership.caregiver_id,
        reminderKey,
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
      (a) => !(a.reminder_offsets ?? []).includes(offsetMinutes),
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
        reminder_offsets: [...(appt.reminder_offsets ?? []), offsetMinutes],
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
    return data ?? [];
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
    return data;
  }

  private async fetchPrimaryCarerMemberships(): Promise<
    PrimaryCarerMembershipRow[]
  > {
    const { data, error } = await this.supabase
      .getClient()
      .from('care_givers')
      .select('caregiver_id, group_id')
      .eq('status', 'active')
      .eq('role_in_care', 'primary_carer');

    if (error) {
      this.logger.warn(`fetch_primary_carers_failed ${error.message}`);
      return [];
    }

    return data ?? [];
  }

  private async fetchCareGroupTimezones(
    groupIds: string[],
  ): Promise<CareGroupTimezoneRow[]> {
    if (!groupIds.length) return [];

    const { data, error } = await this.supabase
      .getClient()
      .from('care_group')
      .select('id, preferred_timezone')
      .in('id', groupIds);

    if (error) {
      this.logger.warn(`fetch_care_group_timezones_failed ${error.message}`);
      return [];
    }

    return data ?? [];
  }

  private async fetchProfilePreferences(
    userIds: string[],
  ): Promise<ProfilePreferenceRow[]> {
    if (!userIds.length) return [];

    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select('id, preferences')
      .in('id', userIds);

    if (error) {
      this.logger.warn(`fetch_profile_preferences_failed ${error.message}`);
      return [];
    }

    return data ?? [];
  }

  private isWeeklyWellbeingReminderEnabled(
    preferences: Record<string, unknown> | null | undefined,
  ): boolean {
    if (!preferences) return true;

    const notifications =
      typeof preferences.notifications === 'object' &&
      preferences.notifications !== null
        ? (preferences.notifications as Record<string, unknown>)
        : null;
    const reminderValue = notifications?.weeklyWellbeingReminderEnabled;

    return reminderValue !== false;
  }

  private getCurrentWeekStartForTimezone(now: Date, timezone: string): string {
    const zonedNow = toZonedTime(now, timezone);
    const startOfToday = new Date(
      zonedNow.getFullYear(),
      zonedNow.getMonth(),
      zonedNow.getDate(),
      12,
      0,
      0,
      0,
    );
    const offsetFromMonday = (zonedNow.getDay() + 6) % 7;
    return format(addDays(startOfToday, -offsetFromMonday), 'yyyy-MM-dd');
  }

  private isWithinWeeklyReminderWindow(
    now: Date,
    timezone: string,
    weekStart: string,
  ): boolean {
    const targetUtc = fromZonedTime(`${weekStart}T09:00:00`, timezone);
    const diffMs = now.getTime() - targetUtc.getTime();

    return diffMs >= 0 && diffMs < WINDOW_MINUTES * 60_000;
  }

  private async hasExistingNotification(
    userId: string,
    type: string,
    relatedEntityId: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .getClient()
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('type', type)
      .eq('related_entity_id', relatedEntityId)
      .limit(1);

    if (error) {
      this.logger.warn(
        `fetch_existing_notification_failed user=${userId} ${error.message}`,
      );
      return false;
    }

    return (data?.length ?? 0) > 0;
  }

  private async hasCurrentWeekWellbeingCheckIn(
    userId: string,
    weekStart: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .getClient()
      .from('primary_carer_wellbeing_checkins')
      .select('id')
      .eq('carer_id', userId)
      .eq('week_start', weekStart)
      .limit(1);

    if (error) {
      this.logger.warn(
        `fetch_wellbeing_checkin_failed user=${userId} ${error.message}`,
      );
      return false;
    }

    return (data?.length ?? 0) > 0;
  }

  private async sendWeeklyWellbeingReminder(
    userId: string,
    reminderKey: string,
  ): Promise<void> {
    const frontendUrl = (
      this.appConfig.config.FRONTEND_PUBLIC_URL ?? 'http://localhost:5173'
    ).replace(/\/$/, '');
    const actionUrl = `${frontendUrl}/settings#wellbeing-checkin`;

    const { error } = await this.supabase
      .getClient()
      .from('notifications')
      .insert({
        user_id: userId,
        type: WELLBEING_REMINDER_TYPE,
        title: WELLBEING_REMINDER_TITLE,
        body: WELLBEING_REMINDER_BODY,
        action_url: actionUrl,
        related_entity_type: 'wellbeing_checkin',
        related_entity_id: reminderKey,
        sent_via: ['push'],
      });

    if (error) {
      this.logger.warn(
        `insert_wellbeing_notification_failed user=${userId} ${error.message}`,
      );
      return;
    }

    await this.pushDispatch
      .sendToUsers([userId], {
        title: WELLBEING_REMINDER_TITLE,
        body: WELLBEING_REMINDER_BODY,
        url: actionUrl,
      })
      .catch((err) =>
        this.logger.warn(`wellbeing_push_failed user=${userId}`, err),
      );
  }

  private async processEveningPatientWellbeingNudges(now: Date): Promise<void> {
    const { data, error } = await this.supabase
      .getClient()
      .from('care_group')
      .select('id, preferred_timezone');

    if (error) {
      this.logger.warn(`fetch_care_groups_failed ${error.message}`);
      return;
    }

    const groups = (data ?? []) as CareGroupTimezoneRow[];
    if (!groups.length) return;

    for (const group of groups) {
      const timezone = group.preferred_timezone ?? 'UTC';
      if (!this.isWithinDailyReminderWindow(now, timezone, 20, 0)) {
        continue;
      }

      const checkinDate = this.getLocalDateForTimezone(now, timezone);
      const reminderKey = `${group.id}:${checkinDate}`;
      const patient = await this.fetchPatientForGroup(group.id);
      if (!patient) continue;

      const onDutyCarerId = await this.fetchEveningShiftAssignee(
        group.id,
        checkinDate,
      );
      if (!onDutyCarerId) continue;

      const [alreadySent, checkinExists, profile] = await Promise.all([
        this.hasExistingNotification(
          onDutyCarerId,
          PATIENT_WELLBEING_NUDGE_TYPE,
          reminderKey,
        ),
        this.hasPatientWellbeingCheckinForDate(patient.id, checkinDate),
        this.fetchProfilePreference(onDutyCarerId),
      ]);

      if (alreadySent || checkinExists) continue;
      if (!this.isEveningPatientCheckinNudgeEnabled(profile?.preferences))
        continue;

      const patientFirstName = this.extractFirstName(patient.full_name);
      await this.sendEveningPatientWellbeingNudge({
        userId: onDutyCarerId,
        groupId: group.id,
        patientFirstName,
        reminderKey,
      });
    }
  }

  private async fetchPatientForGroup(
    groupId: string,
  ): Promise<GroupPatientRow | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('patients')
      .select('id, full_name, group_id')
      .eq('group_id', groupId)
      .maybeSingle();

    if (error) {
      this.logger.warn(
        `fetch_group_patient_failed group=${groupId} ${error.message}`,
      );
      return null;
    }

    return data;
  }

  private async fetchEveningShiftAssignee(
    groupId: string,
    shiftDate: string,
  ): Promise<string | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('weekly_shift_assignments')
      .select('assigned_caregiver_id')
      .eq('group_id', groupId)
      .eq('shift_date', shiftDate)
      .eq('shift_slot', EVENING_SHIFT_SLOT)
      .maybeSingle();

    if (error) {
      this.logger.warn(
        `fetch_evening_shift_failed group=${groupId} ${error.message}`,
      );
      return null;
    }

    return data?.assigned_caregiver_id ?? null;
  }

  private async fetchProfilePreference(
    userId: string,
  ): Promise<ProfilePreferenceRow | null> {
    const profiles = await this.fetchProfilePreferences([userId]);
    return profiles[0] ?? null;
  }

  private async hasPatientWellbeingCheckinForDate(
    patientId: string,
    checkinDate: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .getClient()
      .from('patient_wellbeing_checkins')
      .select('id')
      .eq('patient_id', patientId)
      .eq('checkin_date', checkinDate)
      .limit(1);

    if (error) {
      this.logger.warn(
        `fetch_patient_checkin_failed patient=${patientId} ${error.message}`,
      );
      return false;
    }

    return (data?.length ?? 0) > 0;
  }

  private isEveningPatientCheckinNudgeEnabled(
    preferences: Record<string, unknown> | null | undefined,
  ): boolean {
    if (!preferences) return true;

    const notifications =
      typeof preferences.notifications === 'object' &&
      preferences.notifications !== null
        ? (preferences.notifications as Record<string, unknown>)
        : null;
    const reminderValue = notifications?.eveningPatientCheckinNudgeEnabled;

    return reminderValue !== false;
  }

  private getLocalDateForTimezone(now: Date, timezone: string): string {
    return format(toZonedTime(now, timezone), 'yyyy-MM-dd');
  }

  private isWithinDailyReminderWindow(
    now: Date,
    timezone: string,
    hour: number,
    minute: number,
  ): boolean {
    const targetUtc = fromZonedTime(
      `${this.getLocalDateForTimezone(now, timezone)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
      timezone,
    );
    const diffMs = now.getTime() - targetUtc.getTime();

    return diffMs >= 0 && diffMs < WINDOW_MINUTES * 60_000;
  }

  private extractFirstName(fullName: string): string {
    const trimmed = fullName.trim();
    if (!trimmed) return 'Patient';
    return trimmed.split(/\s+/)[0] ?? 'Patient';
  }

  private async sendEveningPatientWellbeingNudge(params: {
    userId: string;
    groupId: string;
    patientFirstName: string;
    reminderKey: string;
  }): Promise<void> {
    const frontendUrl = (
      this.appConfig.config.FRONTEND_PUBLIC_URL ?? 'http://localhost:5173'
    ).replace(/\/$/, '');
    const actionUrl = `${frontendUrl}/groups/${params.groupId}/journal#wellbeing-checkin`;
    const body = `${params.patientFirstName}'s daily wellbeing check-in hasn't been completed yet`;

    const { error } = await this.supabase
      .getClient()
      .from('notifications')
      .insert({
        user_id: params.userId,
        type: PATIENT_WELLBEING_NUDGE_TYPE,
        title: PATIENT_WELLBEING_NUDGE_TITLE,
        body,
        action_url: actionUrl,
        related_entity_type: 'patient_wellbeing_checkin',
        related_entity_id: params.reminderKey,
        sent_via: ['push'],
      });

    if (error) {
      this.logger.warn(
        `insert_patient_nudge_failed user=${params.userId} ${error.message}`,
      );
      return;
    }

    await this.pushDispatch
      .sendToUsers([params.userId], {
        title: PATIENT_WELLBEING_NUDGE_TITLE,
        body,
        url: actionUrl,
      })
      .catch((err) =>
        this.logger.warn(
          `patient_nudge_push_failed user=${params.userId}`,
          err,
        ),
      );
  }
}
