import { Moon, Sun, Bell, CircleUserRound, Shield } from 'lucide-react';
import type { ReactNode } from 'react';
import WellbeingCheckInSection from '../components/wellbeing/WellbeingCheckInSection';
import PageHeader from '../components/ui/PageHeader';
import { useTheme, type Theme } from '../contexts/ThemeContext';

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

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

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
                Use the bell icon in the header to enable browser push alerts for overdue medications.
              </p>
            </div>
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
