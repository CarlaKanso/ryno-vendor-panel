"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

/**
 * Counts a KPI up on first paint, and tweens between values when the filters
 * change so a card never jump-cuts.
 *
 * Two deliberate choices:
 *
 *  - The first render — on the server and on the client's first pass — outputs
 *    the real number, not zero. A KPI that reads "0" because JavaScript hasn't
 *    run is worse than one that appears without a flourish.
 *  - The tween writes to the DOM node directly rather than through state. A
 *    count-up is ~60 updates a second; putting those through React would
 *    re-render the card on every frame for a number only this span shows.
 *
 * `format` must be a stable function (module scope, not an inline arrow) —
 * it is an effect dependency, so a new identity each render would restart the
 * animation forever.
 */
export function AnimatedNumber({
  value,
  format,
  duration = 0.9,
  className,
}: {
  value: number;
  format: (value: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (reduceMotion) {
      node.textContent = format(value);
      previous.current = value;
      return;
    }

    // First run counts up from zero; later runs tween from the last value.
    const from = previous.current ?? 0;
    previous.current = value;

    const controls = animate(from, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        node.textContent = format(latest);
      },
      onComplete: () => {
        node.textContent = format(value);
      },
    });

    return () => controls.stop();
  }, [value, duration, format, reduceMotion]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
