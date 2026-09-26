"use client";

import { useMemo } from "react";

import { AnimatedNumber } from "@/components/motion/animated-number";
import { useSlideSeen } from "@/components/recap/recap-deck";
import { formatCount, formatMoney } from "@/lib/money";

/**
 * A number that counts up when its slide is reached, not when the page loads.
 *
 * Until the slide has been seen this is the plain figure, server-rendered, so
 * nothing ever reads "0" and the printed page is complete. `AnimatedNumber`
 * only mounts once the slide is reached, and its first mount is what plays
 * the count-up from zero — so the count happens on arrival, once.
 */
export function CountUp({
  value,
  kind = "count",
  currency = "GHS",
  className,
}: {
  value: number;
  kind?: "count" | "money";
  currency?: string;
  className?: string;
}) {
  const seen = useSlideSeen();
  // A stable formatter per currency, because `AnimatedNumber` keys its effect
  // on the function's identity and an inline arrow would restart it forever.
  // Counts round: a tween passes fractional frames, and "37.482 orders" is
  // not a thing. Money keeps its two decimals.
  const format = useMemo(
    () =>
      kind === "money"
        ? (v: number) => formatMoney(v, currency)
        : (v: number) => formatCount(Math.round(v)),
    [kind, currency],
  );

  if (!seen) return <span className={className}>{format(value)}</span>;
  return <AnimatedNumber value={value} format={format} duration={1.4} className={className} />;
}
