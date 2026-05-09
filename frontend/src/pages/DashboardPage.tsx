import { animated, useSpring } from '@react-spring/web';
import { motion } from 'framer-motion';
import { CalendarDays, HeartPulse, Users } from 'lucide-react';
import {
  CARD_VARIANTS,
  STATIC_CARD_VARIANTS,
  STAGGER_CONTAINER_VARIANTS,
  TRANSITIONS,
} from '../lib/animation.constants';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface AnimatedStatValueProps {
  value: number;
  shouldReduceMotion: boolean;
}

function AnimatedStatValue({ value, shouldReduceMotion }: AnimatedStatValueProps) {
  const { number } = useSpring({
    from: { number: shouldReduceMotion ? value : 0 },
    to: { number: value },
    immediate: shouldReduceMotion,
    config: { tension: 120, friction: 18 },
  });

  return (
    <animated.p className="text-2xl font-bold">
      {number.to((currentValue) => Math.round(currentValue).toString())}
    </animated.p>
  );
}

export default function DashboardPage() {
  const shouldReduceMotion = useReducedMotion();
  const cardVariants = shouldReduceMotion ? STATIC_CARD_VARIANTS : CARD_VARIANTS;

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1
            style={{
              color: 'var(--color-text-primary)',
              fontSize: '26px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            Good morning, Caregiver
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Here&apos;s an overview of your care circles today.
          </p>
        </div>
        <div
          className="rounded-lg border bg-white px-4 py-3 text-sm font-semibold"
          style={{
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Apr 30, 2026
        </div>
      </div>

      {/* Stagger draws attention to each stat individually after the page settles. */}
      <motion.div
        className="grid gap-4 md:grid-cols-3"
        variants={STAGGER_CONTAINER_VARIANTS}
        initial="initial"
        animate="animate"
      >
        {[
          { label: 'Active groups', value: 4, icon: Users },
          { label: 'Pending invites', value: 2, icon: HeartPulse },
          { label: "Today's events", value: 3, icon: CalendarDays },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <motion.article
              key={item.label}
              className="rounded-xl border bg-white p-5"
              style={{ borderColor: 'var(--color-border)' }}
              variants={cardVariants}
              transition={TRANSITIONS.card}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                  }}
                >
                  <Icon size={20} strokeWidth={1.9} />
                </span>
                <div>
                  <AnimatedStatValue
                    value={item.value}
                    shouldReduceMotion={shouldReduceMotion}
                  />
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {item.label}
                  </p>
                </div>
              </div>
            </motion.article>
          );
        })}
      </motion.div>
    </section>
  );
}