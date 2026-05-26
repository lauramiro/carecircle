import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';

interface StatCardProps {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  variants?: Variants;
}

export default function StatCard({ icon, value, label, variants }: StatCardProps) {
  return (
    <motion.article
      className="rounded-xl border bg-white p-5"
      style={{ borderColor: 'var(--color-border)' }}
      variants={variants}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
          }}
        >
          {icon}
        </span>
        <div>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {value}
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {label}
          </p>
        </div>
      </div>
    </motion.article>
  );
}
