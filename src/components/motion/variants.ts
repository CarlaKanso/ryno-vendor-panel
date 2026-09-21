import type { Transition, Variants } from "motion/react";

/**
 * Shared motion vocabulary.
 *
 * One spring and one set of variants used everywhere, so the whole panel moves
 * with the same personality instead of each component inventing its own.
 * Distances are small (4–12px) and durations short: this is a tool people use
 * all day, and motion should point at what changed, not perform.
 *
 * `prefers-reduced-motion` is handled globally in `globals.css`, which
 * collapses every transition and animation to ~0ms.
 */

export const spring: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.8,
};

export const softSpring: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 30,
};

/** Container that reveals its children one after another. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
};

/** The child of a `staggerContainer`. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.25 } },
};

/** Table rows: a shorter rise, and a cap on the stagger for long lists. */
export function rowVariants(index: number): Variants {
  return {
    hidden: { opacity: 0, y: 6 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.26,
        delay: Math.min(index, 12) * 0.022,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };
}

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: spring },
  exit: { opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.15 } },
};

export const overlayFade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};
