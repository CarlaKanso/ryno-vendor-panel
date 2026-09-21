import type { Transition, Variants } from "motion/react";

/**
 * The JavaScript half of the motion vocabulary.
 *
 * Entrance animations live in CSS (`globals.css`), because a motion library
 * applies its `initial` style only after hydration and turns every
 * server-rendered list into a hydration mismatch. What is left here is what
 * CSS genuinely cannot express, and it is all client-only by construction:
 *
 *  - shared-layout transitions — the sidebar's active pill, the chart's
 *    granularity pill, the Top Selling underline (`layoutId`)
 *  - exit animations — dialogs, and rows leaving a table (`AnimatePresence`)
 *  - gestures — the press on every button (`whileTap`)
 *  - value tweens — the KPI count-up
 *
 * One spring, used everywhere, so the whole panel moves with one personality.
 * `prefers-reduced-motion` collapses all of it in `globals.css`.
 */

export const softSpring: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 30,
};

/** Dialogs: a small scale-and-rise in, a quick fade out. */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 420, damping: 34, mass: 0.8 },
  },
  exit: { opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.15 } },
};

export const overlayFade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};
