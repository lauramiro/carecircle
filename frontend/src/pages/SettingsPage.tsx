import { Moon, Sun, Bell, CircleUserRound, Shield, ALargeSmall } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import WellbeingCheckInSection from '../components/wellbeing/WellbeingCheckInSection';
import PageHeader from '../components/ui/PageHeader';
import { useTheme, type Theme } from '../contexts/ThemeContext';
import { useFontSize, type FontSize } from '../contexts/FontSizeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { Json } from '../lib/database.types';
import { isCurrentUserPrimaryCarer } from '../api/wellbeing/wellbeing.service';

const VALID_FONT_SIZES: FontSize[] = ['standard', 'large', 'extra-large'];

interface NotificationPreferences {
  weeklyWellbeingReminderEnabled?: boolean;
}

interface AccessibilityPreferences {
  fontSize?: FontSize;
}

interface ProfilePreferences {
  notifications?: NotificationPreferences;
  accessibility?: AccessibilityPreferences;
  [key: string]: unknown;
}

function getWeeklyWellbeingReminderPreference(preferences: ProfilePreferences | null): boolean {
  return preferences?.notifications?.weeklyWellbeingReminderEnabled !== false;
}

interface ThemeOptionProps {
  label: string;
  description: string;
  value: Theme;
  icon: ReactNode;
  selected: boolean;
  onSelect: (value: Theme) => void;
}

function ThemeOption({ label, description, value, icon, selected, onSelect }: ThemeOptionProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(value)}
      className="flex flex-1 items-start gap-3 rounded-xl border p-4 text-left transition-colors"
      style={{
        borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
        backgroundColor: selected ? 'var(--color-primary-light)' : 'var(--color-card)',
        cursor: 'pointer',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
      }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor: selected ? 'var(--color-card)' : 'var(--color-primary-light)',
          color: 'var(--color-primary)',
        }}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {label}
        </span>
        <span className="mt-1 block text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {description}
        </span>
      </span>
    </button>
  );
}

interface FontSizeOptionProps {
  label: string;
  description: string;
  value: FontSize;
  selected: boolean;
  onSelect: (value: FontSize) => void;
}

function FontSizeOption({ label, description, value, selected, onSelect }: FontSizeOptionProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={() => onSelect(value)}
      className="flex flex-1 items-start gap-3 rounded-xl border p-4 text-left transition-colors"
      style={{
        borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
        backgroundColor: selected ? 'var(--color-primary-light)' : 'var(--color-card)',
        cursor: 'pointer',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        minHeight: '44px',
      }}
    >
      <span>
        <span className="block text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {label}
        </span>
        <span className="mt-1 block text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {description}
        </span>
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { fontSize, setFontSize } = useFontSize();
  const { session } = useAuth();
  const [isPrimaryCarer, setIsPrimaryCarer] = useState(false);
  const [preferences, setPreferences] = useState<ProfilePreferences | null>(null);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setIsLoadingNotifications(false);
      setIsPrimaryCarer(false);
      setPreferences(null);
      return;
    }

    const currentUserId = userId;

    let isActive = true;

    async function loadNotificationPreferences() {
      setIsLoadingNotifications(true);
      setNotificationError(null);

      try {
        const [primaryCarer, profileResult] = await Promise.all([
          isCurrentUserPrimaryCarer(),
          supabase.from('profiles').select('preferences').eq('id', currentUserId).maybeSingle(),
        ]);

        if (!isActive) return;
        if (profileResult.error) {
          throw new Error(profileResult.error.message);
        }

        setIsPrimaryCarer(primaryCarer);
        const loadedPreferences = (profileResult.data?.preferences as ProfilePreferences | null) ?? null;
        setPreferences(loadedPreferences);

        const dbFontSize = loadedPreferences?.accessibility?.fontSize;
        if (dbFontSize && VALID_FONT_SIZES.includes(dbFontSize)) {
          setFontSize(dbFontSize);
        }
      } catch (error) {
        if (!isActive) return;
        setNotificationError(
          error instanceof Error
            ? error.message
            : 'Unable to load notification preferences.',
        );
      } finally {
        if (isActive) {
          setIsLoadingNotifications(false);
        }
      }
    }

    void loadNotificationPreferences();

    return () => {
      isActive = false;
    };
  }, [session?.user?.id, setFontSize]);

  async function handleFontSizeChange(nextFontSize: FontSize) {
    setFontSize(nextFontSize);

    const userId = session?.user?.id;
    if (!userId) return;

    const nextPreferences: ProfilePreferences = {
      ...(preferences ?? {}),
      accessibility: { fontSize: nextFontSize },
    };

    const { error } = await supabase
      .from('profiles')
      .update({ preferences: nextPreferences as Json })
      .eq('id', userId);

    if (!error) {
      setPreferences(nextPreferences);
    }
  }

  async function handleWeeklyWellbeingReminderToggle(enabled: boolean) {
    const userId = session?.user?.id;
    if (!userId) return;

    const nextPreferences: ProfilePreferences = {
      ...(preferences ?? {}),
      notifications: {
        ...((preferences?.notifications as NotificationPreferences | undefined) ?? {}),
        weeklyWellbeingReminderEnabled: enabled,
      },
    };

    setIsSavingNotifications(true);
    setNotificationError(null);

    const { error } = await supabase
      .from('profiles')
      .update({ preferences: nextPreferences as Json })
      .eq('id', userId);

    if (error) {
      setNotificationError(error.message || 'Unable to save notification preferences.');
      setIsSavingNotifications(false);
      return;
    }

    setPreferences(nextPreferences);
    setIsSavingNotifications(false);
  }

  const weeklyWellbeingReminderEnabled = getWeeklyWellbeingReminderPreference(preferences);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your account preferences, appearance, and notification settings."
      />

      <article
        className="rounded-2xl border bg-white p-5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="mb-4">
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Appearance
          </h2>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Choose light or dark mode for the CareCircle interface.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <ThemeOption
            label="Light mode"
            description="Bright surfaces with blue accents."
            value="light"
            icon={<Sun size={18} strokeWidth={1.9} />}
            selected={theme === 'light'}
            onSelect={setTheme}
          />
          <ThemeOption
            label="Dark mode"
            description="Dimmed surfaces that are easier on the eyes at night."
            value="dark"
            icon={<Moon size={18} strokeWidth={1.9} />}
            selected={theme === 'dark'}
            onSelect={setTheme}
          />
        </div>
      </article>

      <article
        className="rounded-2xl border bg-white p-5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="mb-4 flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
          >
            <ALargeSmall size={20} strokeWidth={1.9} />
          </span>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Text size
            </h2>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Choose a text size that is comfortable to read. Your preference is saved across sessions.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <FontSizeOption
            label="Standard"
            description="Default browser text size."
            value="standard"
            selected={fontSize === 'standard'}
            onSelect={handleFontSizeChange}
          />
          <FontSizeOption
            label="Large"
            description="12% larger than standard."
            value="large"
            selected={fontSize === 'large'}
            onSelect={handleFontSizeChange}
          />
          <FontSizeOption
            label="Extra-Large"
            description="25% larger than standard."
            value="extra-large"
            selected={fontSize === 'extra-large'}
            onSelect={handleFontSizeChange}
          />
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-2">
        <article
          className="rounded-2xl border bg-white p-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-start gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
            >
              <CircleUserRound size={20} strokeWidth={1.9} />
            </span>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Account
              </h2>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                Profile details, email, and sign-in preferences will be configurable here.
              </p>
            </div>
          </div>
        </article>

        <article
          className="rounded-2xl border bg-white p-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-start gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
            >
              <Bell size={20} strokeWidth={1.9} />
            </span>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Notifications
              </h2>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                Use the bell icon in the header to enable browser push alerts. Weekly wellbeing reminders can be managed here.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
            {isLoadingNotifications ? (
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Loading notification preferences...
              </p>
            ) : isPrimaryCarer ? (
              <div className="space-y-2">
                <label className="flex items-start gap-3" htmlFor="weekly-wellbeing-reminder-toggle">
                  <input
                    id="weekly-wellbeing-reminder-toggle"
                    type="checkbox"
                    checked={weeklyWellbeingReminderEnabled}
                    disabled={isSavingNotifications}
                    onChange={(event) =>
                      void handleWeeklyWellbeingReminderToggle(event.target.checked)
                    }
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span
                      className="block text-sm font-bold"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      Weekly wellbeing check-in reminder
                    </span>
                    <span
                      className="mt-1 block text-xs leading-relaxed"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Send a push reminder every Monday at 9:00 am to complete your wellbeing check-in.
                    </span>
                  </span>
                </label>
                {isSavingNotifications ? (
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Saving your preference...
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Weekly wellbeing reminders are available for primary carers only.
              </p>
            )}

            {notificationError ? (
              <p className="mt-3 text-xs" style={{ color: 'var(--color-status-critical)' }}>
                {notificationError}
              </p>
            ) : null}
          </div>
        </article>

        <article
          className="rounded-2xl border bg-white p-5 xl:col-span-2"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-start gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
            >
              <Shield size={20} strokeWidth={1.9} />
            </span>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Privacy & access
              </h2>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                Role-based access for each care circle is managed from the members page on individual group pages.
              </p>
            </div>
          </div>
        </article>

        <div className="xl:col-span-2">
          <WellbeingCheckInSection />
        </div>
      </div>
    </section>
  );
}
