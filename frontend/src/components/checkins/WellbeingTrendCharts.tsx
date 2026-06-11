import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  type ActiveElement,
  type ChartData,
  type ChartEvent,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { format, parseISO } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { TrendingUp, X, CalendarDays } from 'lucide-react';
import { useCheckinHistory, type HistoryWindow } from '../../hooks/checkins/useCheckinHistory';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  MODAL_BACKDROP_VARIANTS,
  MODAL_PANEL_VARIANTS,
  STATIC_MODAL_VARIANTS,
  TRANSITIONS,
} from '../../lib/animation.constants';
import type { WellbeingCheckin, WellbeingAppetite, WellbeingMobility } from '../../api/checkins/checkins.types';

// Register Chart.js components once at module level
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip);

// ─── Categorical-to-numeric mappings (chart axis only) ───────────────────────

const APPETITE_SCORE: Record<WellbeingAppetite, number> = { good: 3, fair: 2, poor: 1 };
const APPETITE_LABEL: Record<WellbeingAppetite, string> = { good: 'Good', fair: 'Fair', poor: 'Poor' };
const MOBILITY_SCORE: Record<WellbeingMobility, number> = { normal: 3, reduced: 2, very_limited: 1 };
const MOBILITY_LABEL: Record<WellbeingMobility, string> = {
  normal: 'Normal',
  reduced: 'Reduced',
  very_limited: 'Very limited',
};

function moodLabel(mood: number): string {
  const labels: Record<number, string> = { 1: 'Very low', 2: 'Low', 3: 'Neutral', 4: 'Good', 5: 'Very good' };
  return labels[mood] ?? String(mood);
}
function moodEmoji(mood: number): string {
  const emojis: Record<number, string> = { 1: '😞', 2: '😟', 3: '😐', 4: '🙂', 5: '😊' };
  return emojis[mood] ?? '❓';
}
function painColor(level: number): string {
  if (level <= 2) return 'var(--color-status-given)';
  if (level <= 5) return 'var(--color-status-overdue)';
  return 'var(--color-status-critical)';
}

// ─── Chart data shape ────────────────────────────────────────────────────────

interface ChartPoint {
  date: string;
  rawDate: string;
  mood: number;
  painLevel: number;
  appetiteScore: number;
  mobilityScore: number;
  checkin: WellbeingCheckin;
}

function toChartPoints(checkins: WellbeingCheckin[]): ChartPoint[] {
  return checkins.map((c) => ({
    date: format(parseISO(c.checkinDate), 'EEE d'),
    rawDate: c.checkinDate,
    mood: c.mood,
    painLevel: c.painLevel,
    appetiteScore: APPETITE_SCORE[c.appetite],
    mobilityScore: MOBILITY_SCORE[c.mobility],
    checkin: c,
  }));
}

// ─── Window toggle ───────────────────────────────────────────────────────────

function WindowToggle({ value, onChange }: { value: HistoryWindow; onChange: (w: HistoryWindow) => void }) {
  const options: { label: string; value: HistoryWindow }[] = [
    { label: '7 days', value: 7 },
    { label: '30 days', value: 30 },
  ];
  return (
    <div
      className="flex overflow-hidden rounded-lg border"
      style={{ borderColor: 'var(--color-border)' }}
      role="group"
      aria-label="Time window"
    >
      {options.map((opt, idx) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
            className="px-4 py-1.5 text-xs font-bold transition-colors"
            style={{
              backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-card)',
              color: isActive ? '#fff' : 'var(--color-text-secondary)',
              borderRight: idx < options.length - 1 ? '1px solid var(--color-border)' : 'none',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Empty / insufficient-data state ────────────────────────────────────────

const MIN_CHECKINS_FOR_CHART = 3;

function EmptyState({ days }: { days: HistoryWindow }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-xl border py-12 text-center"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-muted)' }}
    >
      <CalendarDays size={36} strokeWidth={1.4} style={{ color: 'var(--color-text-hint)' }} />
      <div>
        <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Not enough data yet
        </p>
        <p className="mt-1 max-w-xs text-xs" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          At least 3 wellbeing check-ins are needed to display trend charts. Keep recording daily
          check-ins and the graphs will appear here automatically.{' '}
          {days === 30 && 'Try switching to the 7-day view if check-ins are recent.'}
        </p>
      </div>
    </div>
  );
}

// ─── Skeleton loader ─────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="carecircle-skeleton rounded-xl" style={{ height: 180 }} />
      ))}
    </div>
  );
}

// ─── Shared chart.js options builders ────────────────────────────────────────

const TOOLTIP_SHARED = {
  displayColors: false,
  padding: 10,
  cornerRadius: 8,
  borderWidth: 1,
  titleFont: { family: 'Plus Jakarta Sans, sans-serif', size: 10 } as const,
  bodyFont: { weight: 'bold' as const, family: 'Plus Jakarta Sans, sans-serif', size: 12 },
};

function buildLineOptions(
  points: ChartPoint[],
  domain: [number, number],
  yTickCallback: (v: string | number) => string,
  valueFormatter: (v: number) => string,
  color: string,
  onPointClick: (c: WellbeingCheckin) => void,
): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...TOOLTIP_SHARED,
        backgroundColor: 'var(--color-card)',
        borderColor: 'var(--color-border)',
        titleColor: 'var(--color-text-hint)',
        bodyColor: color,
        callbacks: {
          title: (items: TooltipItem<'line'>[]) => items[0]?.label ?? '',
          label: (ctx: TooltipItem<'line'>) => valueFormatter(ctx.parsed.y ?? 0),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          font: { size: 9, family: 'Plus Jakarta Sans, sans-serif' },
          color: 'var(--color-text-hint)',
          maxRotation: 0,
          maxTicksLimit: points.length > 14 ? 8 : points.length,
        },
      },
      y: {
        min: domain[0],
        max: domain[1],
        grid: { color: 'var(--color-border)' },
        border: { display: false },
        ticks: {
          font: { size: 9, family: 'Plus Jakarta Sans, sans-serif' },
          color: 'var(--color-text-hint)',
          callback: yTickCallback,
        },
      },
    },
    onClick: (_evt: ChartEvent, elements: ActiveElement[]) => {
      if (elements.length > 0) onPointClick(points[elements[0].index].checkin);
    },
  };
}

function buildBarOptions(
  points: ChartPoint[],
  domain: [number, number],
  yTickCallback: (v: string | number) => string,
  valueFormatter: (v: number) => string,
  color: string,
  onPointClick: (c: WellbeingCheckin) => void,
): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...TOOLTIP_SHARED,
        backgroundColor: 'var(--color-card)',
        borderColor: 'var(--color-border)',
        titleColor: 'var(--color-text-hint)',
        bodyColor: color,
        callbacks: {
          title: (items: TooltipItem<'bar'>[]) => items[0]?.label ?? '',
          label: (ctx: TooltipItem<'bar'>) => valueFormatter(ctx.parsed.y ?? 0),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          font: { size: 9, family: 'Plus Jakarta Sans, sans-serif' },
          color: 'var(--color-text-hint)',
          maxRotation: 0,
          maxTicksLimit: points.length > 14 ? 8 : points.length,
        },
      },
      y: {
        min: domain[0],
        max: domain[1],
        grid: { color: 'var(--color-border)' },
        border: { display: false },
        ticks: {
          font: { size: 9, family: 'Plus Jakarta Sans, sans-serif' },
          color: 'var(--color-text-hint)',
          callback: yTickCallback,
        },
      },
    },
    onClick: (_evt: ChartEvent, elements: ActiveElement[]) => {
      if (elements.length > 0) onPointClick(points[elements[0].index].checkin);
    },
  };
}

// ─── Individual metric chart card ────────────────────────────────────────────

interface MetricCardProps {
  title: string;
  emoji: string;
  points: ChartPoint[];
  getValue: (p: ChartPoint) => number;
  domain: [number, number];
  yTickCallback: (v: string | number) => string;
  valueFormatter: (v: number) => string;
  useBar?: boolean;
  color: string;
  onPointClick: (c: WellbeingCheckin) => void;
}

function MetricCard({
  title,
  emoji,
  points,
  getValue,
  domain,
  yTickCallback,
  valueFormatter,
  useBar = false,
  color,
  onPointClick,
}: MetricCardProps) {
  const labels = points.map((p) => p.date);
  const dataValues = points.map(getValue);

  const lineData: ChartData<'line'> = {
    labels,
    datasets: [{
      data: dataValues,
      borderColor: color,
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: color,
      pointBorderWidth: 0,
      tension: 0.2,
    }],
  };

  const barData: ChartData<'bar'> = {
    labels,
    datasets: [{
      data: dataValues,
      backgroundColor: color,
      hoverBackgroundColor: color,
      borderRadius: 4,
      maxBarThickness: 24,
    }],
  };

  const lineOptions = buildLineOptions(points, domain, yTickCallback, valueFormatter, color, onPointClick);
  const barOptions = buildBarOptions(points, domain, yTickCallback, valueFormatter, color, onPointClick);

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
    >
      <p className="mb-3 flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
        <span role="img" aria-hidden>{emoji}</span>
        {title}
      </p>
      <div style={{ position: 'relative', height: 140 }}>
        {useBar
          ? <Bar data={barData} options={barOptions} />
          : <Line data={lineData} options={lineOptions} />
        }
      </div>
      <p className="mt-2 text-center text-[9px]" style={{ color: 'var(--color-text-hint)' }}>
        Tap any data point to see the full record
      </p>
    </div>
  );
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

function DetailModal({ checkin, onClose }: { checkin: WellbeingCheckin; onClose: () => void }) {
  const shouldReduceMotion = useReducedMotion();
  const formattedDate = format(parseISO(checkin.checkinDate), 'EEEE, d MMMM yyyy');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-detail-title"
    >
      <motion.div
        className="absolute inset-0"
        style={{ backgroundColor: 'var(--color-overlay)' }}
        variants={shouldReduceMotion ? STATIC_MODAL_VARIANTS : MODAL_BACKDROP_VARIANTS}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={onClose}
      />

      <motion.div
        className="relative w-full max-w-sm rounded-2xl shadow-xl"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        variants={shouldReduceMotion ? STATIC_MODAL_VARIANTS : MODAL_PANEL_VARIANTS}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={TRANSITIONS.modal}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <p id="checkin-detail-title" className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Wellbeing record
            </p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-hint)' }}>
              {formattedDate}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close detail"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3 p-5">
          <div className="flex flex-col items-center gap-1 rounded-xl border p-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-muted)' }}>
            <span className="text-2xl leading-none" role="img" aria-label="Mood emoji">{moodEmoji(checkin.mood)}</span>
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-hint)' }}>Mood</p>
            <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{moodLabel(checkin.mood)} ({checkin.mood}/5)</p>
          </div>

          <div className="flex flex-col items-center gap-1 rounded-xl border p-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-muted)' }}>
            <span className="text-2xl font-extrabold leading-none tabular-nums" style={{ color: painColor(checkin.painLevel) }}>{checkin.painLevel}</span>
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-hint)' }}>Pain</p>
            <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>out of 10</p>
          </div>

          <div className="flex flex-col items-center gap-1 rounded-xl border p-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-muted)' }}>
            <span className="text-2xl leading-none" role="img" aria-label="Appetite">🍽️</span>
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-hint)' }}>Appetite</p>
            <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{APPETITE_LABEL[checkin.appetite]}</p>
          </div>

          <div className="flex flex-col items-center gap-1 rounded-xl border p-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-muted)' }}>
            <span className="text-2xl leading-none" role="img" aria-label="Mobility">🚶</span>
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-hint)' }}>Mobility</p>
            <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{MOBILITY_LABEL[checkin.mobility]}</p>
          </div>
        </div>

        {/* Notes */}
        {checkin.notes && (
          <div className="mx-5 mb-5 rounded-xl border px-4 py-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-muted)' }}>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-hint)' }}>Notes</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{checkin.notes}</p>
          </div>
        )}

        {/* Close — observer-safe: no mutation controls */}
        <div className="border-t px-5 py-4" style={{ borderColor: 'var(--color-border)' }}>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border py-2.5 text-sm font-bold"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface WellbeingTrendChartsProps {
  patientId: string;
  groupId: string;
  /** True when the current user's role is Observer — hides all mutation controls */
  isObserver: boolean;
}

export default function WellbeingTrendCharts({ patientId, groupId }: WellbeingTrendChartsProps) {
  const { checkins, loading, error, days, setDays, count } = useCheckinHistory(patientId, groupId);
  const [selectedCheckin, setSelectedCheckin] = useState<WellbeingCheckin | null>(null);

  const points = toChartPoints(checkins);
  const hasEnoughData = count >= MIN_CHECKINS_FOR_CHART;

  return (
    <section
      className="mt-6 rounded-xl border"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      aria-label="Wellbeing trend charts"
    >
      {/* Section header */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <TrendingUp size={18} strokeWidth={1.9} style={{ color: 'var(--color-primary)' }} />
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Wellbeing trends</p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {count} check-in{count !== 1 ? 's' : ''} in the last {days} days
            </p>
          </div>
        </div>
        <WindowToggle value={days} onChange={setDays} />
      </div>

      <div className="p-5">
        {loading && <ChartSkeleton />}

        {!loading && error && (
          <div
            className="rounded-xl border px-4 py-3"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-status-critical-bg)' }}
          >
            <p className="text-sm" style={{ color: 'var(--color-status-critical)' }}>{error}</p>
          </div>
        )}

        {!loading && !error && !hasEnoughData && <EmptyState days={days} />}

        {!loading && !error && hasEnoughData && (
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              title="Mood (1–5)"
              emoji="😊"
              points={points}
              getValue={(p) => p.mood}
              domain={[1, 5]}
              yTickCallback={(v) => ({ 1: 'V.low', 2: 'Low', 3: 'Neutral', 4: 'Good', 5: 'V.good' }[v as number] ?? '')}
              valueFormatter={(v) => `${moodEmoji(v)} ${moodLabel(v)}`}
              onPointClick={setSelectedCheckin}
              color="var(--color-primary)"
            />
            <MetricCard
              title="Pain level (0–10)"
              emoji="🩹"
              points={points}
              getValue={(p) => p.painLevel}
              domain={[0, 10]}
              yTickCallback={(v) => String(v)}
              valueFormatter={(v) => `${v}/10`}
              useBar
              onPointClick={setSelectedCheckin}
              color="var(--color-status-overdue)"
            />
            <MetricCard
              title="Appetite"
              emoji="🍽️"
              points={points}
              getValue={(p) => p.appetiteScore}
              domain={[0.5, 3.5]}
              yTickCallback={(v) => ({ 1: 'Poor', 2: 'Fair', 3: 'Good' }[v as number] ?? '')}
              valueFormatter={(v) => {
                const key = Object.entries(APPETITE_SCORE).find(([, s]) => s === v)?.[0];
                return APPETITE_LABEL[(key ?? 'fair') as WellbeingAppetite];
              }}
              onPointClick={setSelectedCheckin}
              color="var(--color-status-given)"
            />
            <MetricCard
              title="Mobility"
              emoji="🚶"
              points={points}
              getValue={(p) => p.mobilityScore}
              domain={[0.5, 3.5]}
              yTickCallback={(v) => ({ 1: 'V.Ltd', 2: 'Redu', 3: 'Normal' }[v as number] ?? '')}
              valueFormatter={(v) => {
                const key = Object.entries(MOBILITY_SCORE).find(([, s]) => s === v)?.[0];
                return MOBILITY_LABEL[(key ?? 'reduced') as WellbeingMobility];
              }}
              onPointClick={setSelectedCheckin}
              color="var(--color-ai)"
            />
          </div>
        )}
      </div>

      {/* Detail modal — observer-safe (no mutation controls inside) */}
      <AnimatePresence>
        {selectedCheckin && (
          <DetailModal
            checkin={selectedCheckin}
            onClose={() => setSelectedCheckin(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
