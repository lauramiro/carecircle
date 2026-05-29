import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RemindersService } from './reminders.service';

function createQueryResult(data: unknown, error: { message: string } | null = null) {
  return Promise.resolve({ data, error });
}

function createTableQuery(tableName: string, state: {
  memberships?: unknown[];
  profiles?: unknown[];
  careGroups?: unknown[];
  notifications?: unknown[];
  checkIns?: unknown[];
  insertedNotifications: unknown[];
}) {
  const chain = {
    select: vi.fn().mockImplementation(() => chain),
    eq: vi.fn().mockImplementation((column: string, value: unknown) => {
      if (tableName === 'notifications' && column === 'related_entity_id') {
        return {
          limit: vi.fn().mockResolvedValue({
            data: (state.notifications ?? []).filter(
              (notification) =>
                (notification as { related_entity_id?: unknown }).related_entity_id === value,
            ),
            error: null,
          }),
        };
      }

      if (tableName === 'primary_carer_wellbeing_checkins' && column === 'week_start') {
        return {
          limit: vi.fn().mockResolvedValue({
            data: (state.checkIns ?? []).filter(
              (checkIn) => (checkIn as { week_start?: unknown }).week_start === value,
            ),
            error: null,
          }),
        };
      }

      return chain;
    }),
    in: vi.fn().mockImplementation(() => {
      if (tableName === 'profiles') {
        return createQueryResult(state.profiles ?? []);
      }
      if (tableName === 'care_group') {
        return createQueryResult(state.careGroups ?? []);
      }
      return createQueryResult([]);
    }),
    gt: vi.fn().mockImplementation(() => chain),
    gte: vi.fn().mockImplementation(() => chain),
    lte: vi.fn().mockImplementation(() => chain),
    not: vi.fn().mockImplementation(() => chain),
    update: vi.fn().mockImplementation(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    insert: vi.fn().mockImplementation((payload: unknown) => {
      state.insertedNotifications.push(payload);
      return createQueryResult(null);
    }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  if (tableName === 'care_givers') {
    chain.eq = vi.fn().mockImplementation((column: string, value: unknown) => {
      if (column === 'role_in_care' && value === 'primary_carer') {
        return createQueryResult(state.memberships ?? []);
      }
      return chain;
    });
  }

  return chain;
}

describe('RemindersService wellbeing reminders', () => {
  const pushDispatch = {
    sendToUsers: vi.fn().mockResolvedValue(undefined),
  };
  const mailer = {
    isConfigured: vi.fn().mockReturnValue(false),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the Monday wellbeing push once for an enabled primary carer without a check-in', async () => {
    const insertedNotifications: unknown[] = [];
    const state = {
      memberships: [{ caregiver_id: 'user-1', group_id: 'group-1' }],
      profiles: [{ id: 'user-1', preferences: { notifications: { weeklyWellbeingReminderEnabled: true } } }],
      careGroups: [{ id: 'group-1', preferred_timezone: 'Europe/London' }],
      notifications: [],
      checkIns: [],
      insertedNotifications,
    };
    const supabase = {
      isEnabled: vi.fn().mockReturnValue(true),
      getClient: vi.fn().mockReturnValue({
        from: vi.fn((tableName: string) => createTableQuery(tableName, state)),
      }),
    };
    const service = new RemindersService(
      pushDispatch as never,
      mailer as never,
      { cronsEnabled: true, config: { FRONTEND_PUBLIC_URL: 'https://app.example.com' } } as never,
      supabase as never,
    );

    await service.runReminderCheckAt(new Date('2026-06-01T08:01:00.000Z'));

    expect(insertedNotifications).toHaveLength(1);
    expect(insertedNotifications[0]).toEqual(
      expect.objectContaining({
        user_id: 'user-1',
        type: 'wellbeing_checkin_reminder',
        body: 'How are you doing this week? Take 2 minutes for your wellbeing check-in',
        action_url: 'https://app.example.com/settings#wellbeing-checkin',
      }),
    );
    expect(pushDispatch.sendToUsers).toHaveBeenCalledWith(['user-1'], {
      title: 'Weekly wellbeing check-in',
      body: 'How are you doing this week? Take 2 minutes for your wellbeing check-in',
      url: 'https://app.example.com/settings#wellbeing-checkin',
    });
  });

  it('skips the wellbeing push when the current week check-in already exists', async () => {
    const insertedNotifications: unknown[] = [];
    const state = {
      memberships: [{ caregiver_id: 'user-1', group_id: 'group-1' }],
      profiles: [{ id: 'user-1', preferences: { notifications: { weeklyWellbeingReminderEnabled: true } } }],
      careGroups: [{ id: 'group-1', preferred_timezone: 'Europe/London' }],
      notifications: [],
      checkIns: [{ id: 'check-in-1', week_start: '2026-06-01' }],
      insertedNotifications,
    };
    const supabase = {
      isEnabled: vi.fn().mockReturnValue(true),
      getClient: vi.fn().mockReturnValue({
        from: vi.fn((tableName: string) => createTableQuery(tableName, state)),
      }),
    };
    const service = new RemindersService(
      pushDispatch as never,
      mailer as never,
      { cronsEnabled: true, config: { FRONTEND_PUBLIC_URL: 'https://app.example.com' } } as never,
      supabase as never,
    );

    await service.runReminderCheckAt(new Date('2026-06-01T08:01:00.000Z'));

    expect(insertedNotifications).toHaveLength(0);
    expect(pushDispatch.sendToUsers).not.toHaveBeenCalled();
  });

  it('skips the wellbeing push when the preference is disabled', async () => {
    const insertedNotifications: unknown[] = [];
    const state = {
      memberships: [{ caregiver_id: 'user-1', group_id: 'group-1' }],
      profiles: [{ id: 'user-1', preferences: { notifications: { weeklyWellbeingReminderEnabled: false } } }],
      careGroups: [{ id: 'group-1', preferred_timezone: 'Europe/London' }],
      notifications: [],
      checkIns: [],
      insertedNotifications,
    };
    const supabase = {
      isEnabled: vi.fn().mockReturnValue(true),
      getClient: vi.fn().mockReturnValue({
        from: vi.fn((tableName: string) => createTableQuery(tableName, state)),
      }),
    };
    const service = new RemindersService(
      pushDispatch as never,
      mailer as never,
      { cronsEnabled: true, config: { FRONTEND_PUBLIC_URL: 'https://app.example.com' } } as never,
      supabase as never,
    );

    await service.runReminderCheckAt(new Date('2026-06-01T08:01:00.000Z'));

    expect(insertedNotifications).toHaveLength(0);
    expect(pushDispatch.sendToUsers).not.toHaveBeenCalled();
  });
});