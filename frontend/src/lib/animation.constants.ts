import type { Transition, Variants } from 'framer-motion';

export const TRANSITIONS = {
  page: { duration: 0.22, ease: 'easeOut' } satisfies Transition,
  card: { duration: 0.18, ease: 'easeOut' } satisfies Transition,
  modal: { duration: 0.2, ease: 'easeOut' } satisfies Transition,
  dropdown: { duration: 0.18, ease: 'easeOut' } satisfies Transition,
  tap: { duration: 0.1, ease: 'easeOut' } satisfies Transition,
  stagger: { staggerChildren: 0.07 },
};

export const PAGE_VARIANTS: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
};

export const STATIC_PAGE_VARIANTS: Variants = {
  initial: { opacity: 1, y: 0 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 1, y: 0 },
};

export const STAGGER_CONTAINER_VARIANTS: Variants = {
  initial: {},
  animate: {
    transition: TRANSITIONS.stagger,
  },
};

export const CARD_VARIANTS: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

export const STATIC_CARD_VARIANTS: Variants = {
  initial: { opacity: 1, y: 0 },
  animate: { opacity: 1, y: 0 },
};

export const DROPDOWN_VARIANTS: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
};

export const STATIC_DROPDOWN_VARIANTS: Variants = {
  initial: { height: 'auto', opacity: 1 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 'auto', opacity: 1 },
};

export const MODAL_BACKDROP_VARIANTS: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const MODAL_PANEL_VARIANTS: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: 12 },
};

export const STATIC_MODAL_VARIANTS: Variants = {
  initial: { opacity: 1, scale: 1, y: 0 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 1, scale: 1, y: 0 },
};

export const CTA_ATTENTION_ANIMATION = {
  boxShadow: [
    '0 0 0 rgba(74, 111, 165, 0)',
    '0 0 0 6px rgba(74, 111, 165, 0.14)',
    '0 0 0 rgba(74, 111, 165, 0)',
  ],
};

export const STATIC_CTA_ATTENTION_ANIMATION = {
  boxShadow: '0 0 0 rgba(74, 111, 165, 0)',
};
