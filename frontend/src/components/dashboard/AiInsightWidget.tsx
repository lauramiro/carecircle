import { Bot, X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLatestInsight } from '@hooks/dashboard/useLatestInsight';
import { MedicalDisclaimerBanner } from '@components/ui/MedicalDisclaimerBanner';

interface AiInsightWidgetProps {
  patientId: string;
  groupId: string;
  groupName: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  high: 'var(--color-status-critical)',
  medium: 'var(--color-status-overdue)',
  low: 'var(--color-text-secondary)',
};

export default function AiInsightWidget({ patientId, groupId, groupName }: AiInsightWidgetProps) {
  const { insight, loading, error, dismiss } = useLatestInsight(patientId);
  const insightsUrl = `/groups/${groupId}/ai-assistant`;

  return (
    <article
      className="rounded-xl border bg-white p-5"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="mb-4 flex items-center gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
        >
          <Bot size={16} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
            AI Insight
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-hint)' }}>
            {groupName}
          </p>
        </div>
        <Link
          to={insightsUrl}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold no-underline"
          style={{ color: 'var(--color-primary)' }}
          aria-label="View all AI insights"
        >
          View all
          <ArrowRight size={12} strokeWidth={2} />
        </Link>
      </div>

      {loading && (
        <p className="text-sm" style={{ color: 'var(--color-text-hint)' }}>
          Loading insight…
        </p>
      )}

      {!loading && error && (
        <p className="text-sm" style={{ color: 'var(--color-status-critical)' }}>
          {error}
        </p>
      )}

      {!loading && !error && !insight && (
        <p className="text-sm" style={{ color: 'var(--color-text-hint)' }}>
          No AI insights yet.
        </p>
      )}

      {!loading && !error && insight && (
        <div className="relative rounded-lg border p-3" style={{ borderColor: 'var(--color-border)' }}>
          <button
            type="button"
            onClick={() => dismiss(insight.id)}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full"
            style={{ color: 'var(--color-text-hint)' }}
            aria-label="Dismiss this insight"
          >
            <X size={14} strokeWidth={2} />
          </button>
          <div className="flex items-center gap-2 pr-6">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: SEVERITY_COLORS[insight.severity] ?? SEVERITY_COLORS.low }}
              aria-label={`Severity: ${insight.severity}`}
            />
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
              {insight.insightType.replace(/_/g, ' ')}
            </p>
          </div>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
            {insight.observation}
          </p>
          {insight.suggestedAction && (
            <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {insight.suggestedAction}
            </p>
          )}
          <div className="mt-3">
            <MedicalDisclaimerBanner compact />
          </div>
        </div>
      )}
    </article>
  );
}
