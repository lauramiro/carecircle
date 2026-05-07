import { AlertCircle, CheckCircle, Heart, type LucideIcon } from 'lucide-react';

const palette = {
  primary: {
    background: 'var(--color-primary-light)',
    color: 'var(--color-primary)',
    icon: Heart,
  },
  error: {
    background: 'var(--color-status-critical-bg)',
    color: 'var(--color-status-critical)',
    icon: AlertCircle,
  },
  success: {
    background: 'var(--color-status-given-bg)',
    color: 'var(--color-status-given)',
    icon: CheckCircle,
  },
} as const satisfies Record<
  string,
  { background: string; color: string; icon: LucideIcon }
>;

export type ToneIconBadgeTone = keyof typeof palette;

export default function ToneIconBadge({ tone }: { tone: ToneIconBadgeTone }) {
  const { background, color, icon: Icon } = palette[tone];

  return (
    <div
      className="flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4"
      style={{ backgroundColor: background }}
    >
      <Icon size={24} strokeWidth={1.75} style={{ color }} />
    </div>
  );
}
